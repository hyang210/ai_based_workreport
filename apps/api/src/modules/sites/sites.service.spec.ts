import { ConflictException } from '@nestjs/common';
import { SitesService } from './sites.service';

jest.mock('@prisma/client', () => ({ PrismaClient: class {} }));

function setup(locked: number) {
  const prisma: any = {
    report: { count: jest.fn(async () => locked) },
    site: { delete: jest.fn(async () => ({})) },
  };
  const service = new SitesService(prisma);
  jest.spyOn(service, 'findOne').mockResolvedValue({ id: 's1' } as any);
  return { service, prisma };
}

describe('SitesService.remove', () => {
  it('승인된 보고서가 있는 현장은 삭제할 수 없다 (cascade로 증빙이 사라지지 않게)', async () => {
    const { service, prisma } = setup(1);
    await expect(service.remove('c1', 's1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.report.count.mock.calls[0][0].where).toEqual({
      workOrder: { siteId: 's1' },
      status: { in: ['APPROVED', 'GENERATED', 'SENT'] },
    });
    expect(prisma.site.delete).not.toHaveBeenCalled();
  });

  it('승인된 보고서가 없으면 삭제한다', async () => {
    const { service, prisma } = setup(0);
    await service.remove('c1', 's1');
    expect(prisma.site.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });
});
