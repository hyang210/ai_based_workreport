import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAllForCompany(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async invite(companyId: string, dto: InviteUserDto) {
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, SALT_ROUNDS);
    return this.prisma.user.create({
      data: {
        companyId,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  remove(companyId: string, userId: string) {
    // companyId 조건을 반드시 함께 걸어 다른 회사의 사용자를 지울 수 없게 한다.
    return this.prisma.user.deleteMany({ where: { id: userId, companyId } });
  }
}
