import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// 작성·수정·승인·다운로드 등 감사 이력 (설계서 7.1).
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // db: 다른 변경과 같은 트랜잭션에 묶을 때 그 트랜잭션 클라이언트를 넘긴다.
  log(
    companyId: string,
    actorId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    return db.auditLog.create({
      data: { companyId, actorId: actorId ?? undefined, action, entityType, entityId },
    });
  }

  findForCompany(companyId: string, take = 100) {
    return this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
