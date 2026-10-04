import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';

jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  AttachmentType: { PHOTO_BEFORE: 'PHOTO_BEFORE', PHOTO_AFTER: 'PHOTO_AFTER', PHOTO_GENERAL: 'PHOTO_GENERAL', VOICE: 'VOICE', DOCUMENT: 'DOCUMENT' },
  WorkOrderStatus: { OPEN: 'OPEN', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED' },
}));

function setup(reportStatuses: string[]) {
  const prisma: any = { workOrder: { update: jest.fn(async () => ({})) } };
  const service = new WorkOrdersService(prisma, {} as any);
  jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'wo-1', reports: reportStatuses.map((status) => ({ status })) } as any);
  return { service, prisma };
}

describe('WorkOrdersService.update — 작업 취소', () => {
  it.each(['APPROVED', 'GENERATED', 'SENT'])('%s 보고서가 있으면 취소할 수 없다', async (status) => {
    const { service, prisma } = setup(['DRAFT', status]);
    await expect(service.update('c1', 'wo-1', { status: 'CANCELLED' } as any)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.workOrder.update).not.toHaveBeenCalled();
  });

  it('미승인 보고서만 있으면 취소할 수 있다', async () => {
    const { service, prisma } = setup(['DRAFT', 'AI_GENERATED', 'REVIEW']);
    await service.update('c1', 'wo-1', { status: 'CANCELLED' } as any);
    expect(prisma.workOrder.update).toHaveBeenCalled();
  });

  it('취소가 아닌 상태 변경은 승인된 보고서가 있어도 막지 않는다', async () => {
    const { service, prisma } = setup(['APPROVED']);
    await service.update('c1', 'wo-1', { status: 'COMPLETED' } as any);
    expect(prisma.workOrder.update).toHaveBeenCalled();
  });
});

describe('WorkOrdersService.update — 담당자 변경', () => {
  it('다른 회사 사용자는 담당자로 지정할 수 없다', async () => {
    const { service, prisma } = setup([]);
    prisma.user = { findFirst: jest.fn(async () => null) };
    await expect(service.update('c1', 'wo-1', { assignedUserId: 'other-company-user' } as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: 'other-company-user', companyId: 'c1' } });
    expect(prisma.workOrder.update).not.toHaveBeenCalled();
  });

  it('같은 회사 사용자는 담당자로 지정할 수 있다', async () => {
    const { service, prisma } = setup([]);
    prisma.user = { findFirst: jest.fn(async () => ({ id: 'u2' })) };
    await service.update('c1', 'wo-1', { assignedUserId: 'u2' } as any);
    expect(prisma.workOrder.update).toHaveBeenCalled();
  });
});

describe('WorkOrdersService.addAttachment — 파일 URL', () => {
  function attachSetup(own: boolean) {
    const prisma: any = { attachment: { findUnique: jest.fn(async () => null), create: jest.fn(async ({ data }: any) => data) } };
    const attachments: any = { isOwnFileUrl: jest.fn(() => own) };
    const service = new WorkOrdersService(prisma, attachments);
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 'wo-1' } as any);
    return { service, prisma, attachments };
  }

  it('우리 저장소의 이 회사 파일이 아니면 거부한다', async () => {
    const { service, prisma, attachments } = attachSetup(false);
    await expect(service.addAttachment('c1', 'wo-1', { type: 'PHOTO_AFTER', fileUrl: 'https://evil.example/x.png' } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(attachments.isOwnFileUrl).toHaveBeenCalledWith('c1', 'https://evil.example/x.png');
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it('우리 저장소 파일이면 첨부한다', async () => {
    const { service, prisma } = attachSetup(true);
    await service.addAttachment('c1', 'wo-1', { type: 'PHOTO_AFTER', fileUrl: 'http://x/api/files/c1/a.png' } as any);
    expect(prisma.attachment.create).toHaveBeenCalled();
  });
});
