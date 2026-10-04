import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SyncService } from './sync.service';

jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  AttachmentType: { PHOTO_BEFORE: 'PHOTO_BEFORE', PHOTO_AFTER: 'PHOTO_AFTER', PHOTO_GENERAL: 'PHOTO_GENERAL', VOICE: 'VOICE', DOCUMENT: 'DOCUMENT' },
  WorkOrderStatus: { OPEN: 'OPEN', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' },
}));

const WO = '11111111-1111-4111-8111-111111111111';
const REC = '22222222-2222-4222-8222-222222222222';
let n = 0;
const ev = (over: any) => ({
  eventId: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
  deviceId: 'dev-1',
  entityType: 'work_order',
  entityId: WO,
  operation: 'CREATE',
  payload: { siteId: 'site-1' },
  ...over,
});

function setup() {
  const store = new Map<string, any>();
  const prisma: any = {
    syncEvent: {
      findUnique: jest.fn(async ({ where }: any) => store.get(where.eventId) ?? null),
      create: jest.fn(async ({ data }: any) => store.set(data.eventId, data)),
      findMany: jest.fn(async () => []),
    },
  };
  const workOrders: any = {
    create: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
    addRecord: jest.fn(async () => ({})),
    addAttachment: jest.fn(async () => ({})),
    findByClientUuid: jest.fn(async () => ({ id: 'wo-1', status: 'OPEN' })),
  };
  return { service: new SyncService(prisma, workOrders), prisma, workOrders, store };
}
const push = (s: SyncService, events: any[], company = 'c1') => s.pushEvents(company, { events } as any);

describe('SyncService', () => {
  it('작업 생성 이벤트를 도메인 서비스에 적용하고 회사 ID와 함께 ACK를 기록한다', async () => {
    const { service, workOrders, store } = setup();
    const e = ev({});
    const { results } = await push(service, [e]);
    expect(results).toEqual([{ eventId: e.eventId, status: 'APPLIED', error: undefined }]);
    expect(workOrders.create).toHaveBeenCalledWith('c1', expect.objectContaining({ clientUuid: WO, siteId: 'site-1' }));
    expect(store.get(e.eventId)).toMatchObject({ companyId: 'c1', status: 'APPLIED' });
  });

  it('같은 eventId 재전송은 다시 적용하지 않고 이전 결과를 돌려준다 (멱등)', async () => {
    const { service, workOrders } = setup();
    const e = ev({});
    await push(service, [e]);
    const { results } = await push(service, [e]);
    expect(results[0].status).toBe('APPLIED');
    expect(workOrders.create).toHaveBeenCalledTimes(1);
  });

  it('다른 회사가 이미 쓴 eventId는 거부한다', async () => {
    const { service, workOrders } = setup();
    const e = ev({});
    await push(service, [e], 'c1');
    const { results } = await push(service, [e], 'c2');
    expect(results[0].status).toBe('FAILED');
    expect(workOrders.create).toHaveBeenCalledTimes(1);
  });

  it('서버에서 이미 완료된 작업의 상태 변경은 서버 값 우선으로 거부한다', async () => {
    const { service, workOrders } = setup();
    workOrders.findByClientUuid.mockResolvedValue({ id: 'wo-1', status: 'COMPLETED' });
    const { results } = await push(service, [ev({ operation: 'UPDATE', payload: { status: 'IN_PROGRESS' } })]);
    expect(results[0]).toMatchObject({ status: 'FAILED', error: expect.stringContaining('서버 값 우선') });
    expect(workOrders.update).not.toHaveBeenCalled();
  });

  it('진행 중인 작업의 상태 변경은 적용한다', async () => {
    const { service, workOrders } = setup();
    const { results } = await push(service, [ev({ operation: 'UPDATE', payload: { status: 'COMPLETED' } })]);
    expect(results[0].status).toBe('APPLIED');
    expect(workOrders.update).toHaveBeenCalledWith('c1', 'wo-1', { status: 'COMPLETED' });
  });

  it('기록은 append-only라서 수정 이벤트는 거부한다', async () => {
    const { service, workOrders } = setup();
    const { results } = await push(service, [ev({ entityType: 'work_record', entityId: REC, operation: 'UPDATE', payload: {} })]);
    expect(results[0].status).toBe('FAILED');
    expect(workOrders.addRecord).not.toHaveBeenCalled();
  });

  it('기록 생성은 workOrderClientUuid로 작업을 찾아 clientUuid와 함께 저장한다', async () => {
    const { service, workOrders } = setup();
    const e = ev({ entityType: 'work_record', entityId: REC, payload: { workOrderClientUuid: WO, description: '점검' } });
    const { results } = await push(service, [e]);
    expect(results[0].status).toBe('APPLIED');
    expect(workOrders.findByClientUuid).toHaveBeenCalledWith('c1', WO);
    expect(workOrders.addRecord).toHaveBeenCalledWith('c1', 'wo-1', expect.objectContaining({ clientUuid: REC, description: '점검' }));
  });

  it('부모 작업이 없으면 FAILED로 기록한다', async () => {
    const { service, workOrders } = setup();
    workOrders.findByClientUuid.mockRejectedValue(new NotFoundException('작업을 찾을 수 없습니다.'));
    const e = ev({ entityType: 'work_record', entityId: REC, payload: { workOrderClientUuid: WO } });
    expect((await push(service, [e])).results[0].status).toBe('FAILED');
  });

  it('잘못된 payload(첨부 타입 오류)는 DTO 검증에서 거부한다', async () => {
    const { service, workOrders } = setup();
    const e = ev({ entityType: 'attachment', entityId: REC, payload: { workOrderClientUuid: WO, type: 'NOPE', fileUrl: 'u' } });
    expect((await push(service, [e])).results[0].status).toBe('FAILED');
    expect(workOrders.addAttachment).not.toHaveBeenCalled();
  });

  it('예상치 못한 오류는 기록하지 않고 던진다 -> 클라이언트가 같은 이벤트를 재전송한다', async () => {
    const { service, workOrders, store } = setup();
    workOrders.create.mockRejectedValue(new Error('db down'));
    const e = ev({});
    await expect(push(service, [e])).rejects.toThrow('db down');
    expect(store.has(e.eventId)).toBe(false);
  });

  it('pull은 요청한 회사의 이벤트만 조회한다', async () => {
    const { service, prisma } = setup();
    await service.pull('c1', 'dev-1');
    expect(prisma.syncEvent.findMany.mock.calls[0][0].where).toMatchObject({ companyId: 'c1' });
  });

  it('pull 커서는 (createdAt, eventId) 기준으로 이어서 가져온다 — 같은 밀리초 이벤트가 빠지지 않게', async () => {
    const { service, prisma } = setup();
    const t = new Date('2026-10-05T00:00:00.000Z');
    prisma.syncEvent.findMany.mockResolvedValueOnce([{ eventId: 'e-2', createdAt: t }]);
    const first = await service.pull('c1', 'dev-1', '2026-10-04T23:59:59.000Z|e-0');
    expect(first.nextCursor).toBe('2026-10-05T00:00:00.000Z|e-2');
    const where = prisma.syncEvent.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { createdAt: { gt: new Date('2026-10-04T23:59:59.000Z') } },
      { createdAt: new Date('2026-10-04T23:59:59.000Z'), eventId: { gt: 'e-0' } },
    ]);
    expect(prisma.syncEvent.findMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'asc' }, { eventId: 'asc' }]);
  });

  it.each(['not-a-date|e-1', '2026-10-05T00:00:00.000Z'])('잘못된 pull 커서(%s)는 400', async (cursor) => {
    const { service } = setup();
    await expect(service.pull('c1', 'dev-1', cursor)).rejects.toBeInstanceOf(BadRequestException);
  });
});
