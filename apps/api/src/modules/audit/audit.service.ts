import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// 작성·수정·승인·다운로드 등 감사 이력 (설계서 7.1).
@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(companyId: string, actorId: string | null, action: string, entityType: string, entityId: string) {
    return this.prisma.auditLog.create({
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
