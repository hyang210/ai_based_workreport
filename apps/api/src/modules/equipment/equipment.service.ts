import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  findAllForSite(companyId: string, siteId: string) {
    return this.prisma.equipment.findMany({
      where: { siteId, site: { companyId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, site: { companyId } },
      include: {
        // 설비 이력 Context AI (설계서 5.5) — 최근 N건만 노출
        history: { orderBy: { occurredAt: 'desc' }, take: 10 },
      },
    });
    if (!equipment) throw new NotFoundException('설비를 찾을 수 없습니다.');
    return equipment;
  }

  async findByQrCode(companyId: string, qrCode: string) {
    const equipment = await this.prisma.equipment.findFirst({ where: { qrCode, site: { companyId } } });
    if (!equipment) throw new NotFoundException('해당 QR 코드의 설비를 찾을 수 없습니다.');
    return equipment;
  }

  async create(companyId: string, dto: CreateEquipmentDto) {
    // siteId가 실제로 같은 회사 소속인지 확인 (테넌트 경계).
    const site = await this.prisma.site.findFirst({ where: { id: dto.siteId, companyId } });
    if (!site) throw new NotFoundException('현장을 찾을 수 없습니다.');
    return this.prisma.equipment.create({ data: dto });
  }

  async update(companyId: string, id: string, dto: UpdateEquipmentDto) {
    await this.findOne(companyId, id);
    return this.prisma.equipment.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.prisma.equipment.delete({ where: { id } });
  }

  // 설비 이력 Context (설계서 5.5): 같은 회사 설비의 최근 이력 N건을 AI 프롬프트용 텍스트로 만든다.
  // 지금 처리 중인 작업 자신의 이력은 제외한다. 이력이 없으면 undefined.
  async buildContext(companyId: string, equipmentId: string, excludeWorkOrderId?: string, limit = 5) {
    const rows = await this.prisma.equipmentHistory.findMany({
      where: { equipmentId, equipment: { site: { companyId } } },
      orderBy: { occurredAt: 'desc' },
      take: limit + 1, // 제외 대상 1건을 걸러내도 limit건이 남도록 여유를 둔다
    });
    const recent = rows.filter((r: { workOrderId: string | null }) => r.workOrderId !== excludeWorkOrderId).slice(0, limit);
    if (recent.length === 0) return undefined;
    return recent
      .map((r: { occurredAt: Date; summary: string }) => `- ${r.occurredAt.toISOString().slice(0, 10)} ${r.summary}`)
      .join('\n');
  }

  // 승인된 보고서의 작업 결과를 설비 이력으로 남긴다. 같은 작업은 한 번만 기록한다
  // (한 작업에서 여러 템플릿의 보고서를 승인해도 이력이 중복되지 않게).
  async recordHistory(equipmentId: string, workOrderId: string, summary: string, occurredAt: Date) {
    const existing = await this.prisma.equipmentHistory.findFirst({ where: { equipmentId, workOrderId } });
    if (existing) return existing;
    return this.prisma.equipmentHistory.create({ data: { equipmentId, workOrderId, summary, occurredAt } });
  }
}
