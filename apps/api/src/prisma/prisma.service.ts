import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// 회사 단위 멀티테넌시: 모든 조회는 companyId를 기본 조건으로 걸어야 한다 (설계서 7.1).
// 이 서비스 자체는 raw PrismaClient를 감쌀 뿐이고, 테넌트 경계는 각 모듈의 서비스 레이어에서 강제한다.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
