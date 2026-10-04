import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReportsService } from './reports.service';

jest.mock('@prisma/client', () => ({ PrismaClient: class {} }));

const fields = [
  { fieldKey: 'issue', fieldType: 'text', required: true },
  { fieldKey: 'after_photos', fieldType: 'photo', required: true },
];
const report = (over: any = {}) => ({
  id: 'r1',
  status: 'AI_GENERATED',
  content: { issue: '나사 풀림', action: '조임', result: '정상' },
  workOrder: { id: 'wo-1', equipmentId: 'eq-1', attachments: [{ type: 'PHOTO_AFTER' }], workRecords: [] },
  template: { templateFields: fields },
  ...over,
});

function setup(r: any) {
  const prisma: any = {
    report: {
      update: jest.fn(async ({ data }: any) => ({ ...r, ...data })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: jest.fn(async () => ({ ...r, status: 'APPROVED' })),
      delete: jest.fn(),
    },
    aiGeneration: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  const equipment: any = { recordHistory: jest.fn(), buildContext: jest.fn(async () => '- 2026-08-12 베어링 교체') };
  const audit: any = { log: jest.fn() };
  const ai: any = { structure: jest.fn(async () => ({ model: 'm', output: { description: 'd', issue: null, action: null, result: null } })) };
  const service = new ReportsService(prisma, {} as any, {} as any, audit, ai, equipment);
  jest.spyOn(service, 'findOne').mockResolvedValue(r);
  return { service, prisma, equipment, audit, ai };
}

describe('ReportsService', () => {
  it('필수 항목이 비어 있으면 승인을 막고 누락 필드를 알려준다', async () => {
    const { service, prisma } = setup(report({ workOrder: { ...report().workOrder, attachments: [] } }));
    await expect(service.approve('c1', 'r1', 'u1')).rejects.toThrow(/after_photos/);
    expect(prisma.report.updateMany).not.toHaveBeenCalled();
  });

  it('AI 초안 전(DRAFT)에는 승인할 수 없다', async () => {
    const { service } = setup(report({ status: 'DRAFT' }));
    await expect(service.approve('c1', 'r1', 'u1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('누락이 없으면 승인하고, 작업 결과를 설비 이력으로 남기고, 감사 로그를 쓴다 (한 트랜잭션)', async () => {
    const { service, prisma, equipment, audit } = setup(report());
    await expect(service.approve('c1', 'r1', 'u1')).resolves.toMatchObject({ status: 'APPROVED' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.report.updateMany.mock.calls[0][0].where).toEqual({ id: 'r1', status: { in: ['AI_GENERATED', 'REVIEW'] } });
    expect(equipment.recordHistory).toHaveBeenCalledWith('eq-1', 'wo-1', '나사 풀림 → 조임 → 정상', expect.any(Date), prisma);
    expect(audit.log).toHaveBeenCalledWith('c1', 'u1', 'approve', 'report', 'r1', prisma);
  });

  it('동시 요청으로 이미 승인됐으면(갱신 0건) 거부하고 이력·감사 로그를 남기지 않는다', async () => {
    const { service, prisma, equipment, audit } = setup(report());
    prisma.report.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.approve('c1', 'r1', 'u1')).rejects.toBeInstanceOf(ConflictException);
    expect(equipment.recordHistory).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('AI 초안은 설비 이력 Context를 붙여 구조화하고 결과와 생성 이력을 저장한다', async () => {
    const r = report({ status: 'DRAFT', content: null, workOrder: { ...report().workOrder, workRecords: [{ description: '소음 점검' }] } });
    const { service, prisma, ai } = setup(r);
    await service.draftWithAi('c1', 'r1');
    expect(ai.structure).toHaveBeenCalledWith({ text: '소음 점검', equipmentContext: '- 2026-08-12 베어링 교체' });
    expect(prisma.aiGeneration.create).toHaveBeenCalled();
    expect(prisma.report.update.mock.calls[0][0].data.status).toBe('AI_GENERATED');
  });

  it('관리자가 고친 초안(REVIEW)은 overwrite 없이 덮어쓰지 않는다', async () => {
    const r = report({ status: 'REVIEW', workOrder: { ...report().workOrder, workRecords: [{ description: '소음 점검' }] } });
    const { service, prisma, ai } = setup(r);
    await expect(service.draftWithAi('c1', 'r1')).rejects.toBeInstanceOf(ConflictException);
    expect(ai.structure).not.toHaveBeenCalled();
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it('overwrite를 명시하면 REVIEW 초안도 새로 만든다', async () => {
    const r = report({ status: 'REVIEW', workOrder: { ...report().workOrder, workRecords: [{ description: '소음 점검' }] } });
    const { service, prisma } = setup(r);
    await service.draftWithAi('c1', 'r1', { overwrite: true });
    expect(prisma.report.update.mock.calls[0][0].data.status).toBe('AI_GENERATED');
  });

  it('작업 기록이 없으면 초안을 만들지 않는다', async () => {
    const { service } = setup(report({ status: 'DRAFT' }));
    await expect(service.draftWithAi('c1', 'r1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('승인된 보고서는 내용을 수정할 수 없고, 템플릿에 없는 필드도 거부한다', async () => {
    await expect(setup(report({ status: 'APPROVED' })).service.updateContent('c1', 'r1', { issue: 'x' })).rejects.toBeInstanceOf(ConflictException);
    await expect(setup(report()).service.updateContent('c1', 'r1', { bogus: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('승인 전에는 PDF를 만들 수 없다', async () => {
    await expect(setup(report({ status: 'REVIEW' })).service.generatePdf('c1', 'r1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('미승인 보고서는 삭제하고 감사 로그를 남긴다', async () => {
    const { service, prisma, audit } = setup(report({ status: 'REVIEW' }));
    await expect(service.remove('c1', 'r1', 'u1')).resolves.toEqual({ deleted: true });
    expect(prisma.report.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    expect(audit.log).toHaveBeenCalledWith('c1', 'u1', 'delete', 'report', 'r1');
  });

  it.each(['APPROVED', 'GENERATED'])('%s 보고서는 삭제할 수 없다', async (status) => {
    const { service, prisma } = setup(report({ status }));
    await expect(service.remove('c1', 'r1', 'u1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.report.delete).not.toHaveBeenCalled();
  });

  it('취소된 작업에는 보고서를 만들 수 없다', async () => {
    const { service, prisma } = setup(report());
    prisma.reportTemplate = { findFirst: jest.fn(async () => ({ id: 't1' })) };
    prisma.workOrder = { findFirst: jest.fn(async () => ({ id: 'wo-1', status: 'CANCELLED' })) };
    prisma.report.create = jest.fn();
    await expect(service.create('c1', { workOrderId: 'wo-1', templateId: 't1' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });
});
