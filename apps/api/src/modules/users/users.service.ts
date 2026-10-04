import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { InviteUserDto } from './dto/invite-user.dto';

const SALT_ROUNDS = 10;

// 사용자를 응답에 실을 때 쓰는 공개 필드. include: true로 불러오면 passwordHash까지 나가므로 항상 이것으로 고른다.
export const PUBLIC_USER_SELECT = { id: true, name: true, email: true, role: true } as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAllForCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: { ...PUBLIC_USER_SELECT, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(companyId: string, inviterRole: AuthUser['role'], dto: InviteUserDto) {
    // ADMIN 계정은 ADMIN만 만들 수 있다 (MANAGER의 권한 상승 방지).
    if (dto.role === 'ADMIN' && inviterRole !== 'ADMIN') {
      throw new ForbiddenException('관리자 계정은 관리자만 초대할 수 있습니다.');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('이미 등록된 이메일입니다.');

    const passwordHash = await bcrypt.hash(dto.temporaryPassword, SALT_ROUNDS);
    return this.prisma.user.create({
      data: {
        companyId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash,
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  remove(companyId: string, userId: string) {
    // companyId 조건을 반드시 함께 걸어 다른 회사의 사용자를 지울 수 없게 한다.
    return this.prisma.user.deleteMany({ where: { id: userId, companyId } });
  }
}
