import { ConflictException } from '@nestjs/common';
import { TemplatesService } from './templates.service';

jest.mock('@prisma/client', () => ({ PrismaClient: class {} }));

function setup({ locked = 0, total = 0 } = {}) {
  const prisma: any = {
    report: { count: jest.fn(async ({ where }: any) => (where.status ? locked : total)) },
    reportTemplate: { update: jest.fn(async () => ({})), delete: jest.fn(async () => ({})) },
    templateField: { deleteMany: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  const service = new TemplatesService(prisma);
  jest.spyOn(service, 'findOne').mockResolvedValue({ id: 't1' } as any);
  return { service, prisma };
}

describe('TemplatesService — 승인된 보고서 보호', () => {
  it('승인된 보고서가 쓰는 템플릿은 필드·섹션을 바꿀 수 없다', async () => {
    const { service, prisma } = setup({ locked: 1 });
    await expect(service.update('c1', 't1', { fields: [] })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update('c1', 't1', { sections: {} })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.templateField.deleteMany).not.toHaveBeenCalled();
    expect(prisma.reportTemplate.update).not.toHaveBeenCalled();
  });

  it('승인된 보고서가 있어도 이름은 바꿀 수 있다', async () => {
    const { service, prisma } = setup({ locked: 1 });
    await service.update('c1', 't1', { name: '새 이름' });
    expect(prisma.reportTemplate.update).toHaveBeenCalled();
  });

  it('승인된 보고서가 없으면 필드를 바꿀 수 있다', async () => {
    const { service, prisma } = setup({ locked: 0 });
    await service.update('c1', 't1', { fields: [] });
    expect(prisma.reportTemplate.update).toHaveBeenCalled();
  });

  it('보고서가 참조 중인 템플릿은 삭제할 수 없다 (500 대신 409)', async () => {
    const { service, prisma } = setup({ total: 2 });
    await expect(service.remove('c1', 't1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.reportTemplate.delete).not.toHaveBeenCalled();
  });

  it('참조하는 보고서가 없으면 삭제한다', async () => {
    const { service, prisma } = setup({ total: 0 });
    await service.remove('c1', 't1');
    expect(prisma.reportTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});
