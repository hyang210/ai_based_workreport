import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';

jest.mock('@prisma/client', () => ({ PrismaClient: class {} }));

function setup(existing: unknown = null) {
  const prisma: any = {
    user: {
      findUnique: jest.fn(async () => existing),
      create: jest.fn(async ({ data }: any) => ({ id: 'new', email: data.email, name: data.name, role: data.role })),
    },
  };
  return { service: new UsersService(prisma), prisma };
}

const dto = (role: 'ADMIN' | 'MANAGER' | 'WORKER') =>
  ({ email: 'new@example.com', name: '신규', role, temporaryPassword: 'temp-pass-1' }) as any;

describe('UsersService.invite', () => {
  it('MANAGER는 ADMIN을 초대할 수 없다', async () => {
    const { service, prisma } = setup();
    await expect(service.invite('c1', 'MANAGER', dto('ADMIN'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each(['MANAGER', 'WORKER'] as const)('MANAGER는 %s를 초대할 수 있다', async (role) => {
    const { service, prisma } = setup();
    await service.invite('c1', 'MANAGER', dto(role));
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('ADMIN은 ADMIN을 초대할 수 있다', async () => {
    const { service, prisma } = setup();
    await service.invite('c1', 'ADMIN', dto('ADMIN'));
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('이미 등록된 이메일이면 409', async () => {
    const { service, prisma } = setup({ id: 'u1' });
    await expect(service.invite('c1', 'ADMIN', dto('WORKER'))).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('응답에 passwordHash를 고르지 않는다', async () => {
    const { service, prisma } = setup();
    await service.invite('c1', 'ADMIN', dto('WORKER'));
    expect(prisma.user.create.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });
});
