import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('이미 등록된 이메일입니다.');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // 회사 생성 + 관리자 계정 생성을 하나의 트랜잭션으로 처리 (온보딩 1단계).
    const { company, user } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const company = await tx.company.create({ data: { name: dto.companyName } });
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: dto.email,
          name: dto.name,
          role: dto.role,
          passwordHash,
        },
      });
      return { company, user };
    });

    return this.buildToken(user.id, company.id, user.role, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    return this.buildToken(user.id, user.companyId, user.role, user.email);
  }

  private buildToken(userId: string, companyId: string, role: string, email: string) {
    const accessToken = this.jwt.sign({ sub: userId, companyId, role, email });
    return { accessToken };
  }
}
