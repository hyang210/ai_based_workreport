import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { CreateWorkRecordDto } from './dto/create-work-record.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId: string, filters: { siteId?: string; status?: string }) {
    return this.prisma.workOrder.findMany({
      where: {
        site: { companyId },
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      include: { site: true, equipment: true, assignedWorker: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, site: { companyId } },
      include: {
        site: true,
        equipment: true,
        assignedWorker: true,
        workRecords: true,
        attachments: true,
        reports: true,
      },
    });
    if (!workOrder) throw new NotFoundException('작업을 찾을 수 없습니다.');
    return workOrder;
  }

  async create(companyId: string, dto: CreateWorkOrderDto) {
    // 동일 clientUuid로 재전송된 경우 새로 만들지 않고 기존 레코드를 반환 (idempotency).
    const existing = await this.prisma.workOrder.findUnique({
      where: { clientUuid: dto.clientUuid },
      include: { site: { select: { companyId: true } } },
    });
    if (existing) {
      if (existing.site.companyId !== companyId) throw new ConflictException('이미 사용된 clientUuid입니다.');
      return existing;
    }

    const site = await this.prisma.site.findFirst({ where: { id: dto.siteId, companyId } });
    if (!site) throw new NotFoundException('현장을 찾을 수 없습니다.');

    // 설비/담당자도 같은 회사(현장) 소속이어야 한다.
    if (dto.equipmentId) {
      const equipment = await this.prisma.equipment.findFirst({ where: { id: dto.equipmentId, siteId: site.id } });
      if (!equipment) throw new NotFoundException('해당 현장의 설비를 찾을 수 없습니다.');
    }
    if (dto.assignedUserId) {
      const user = await this.prisma.user.findFirst({ where: { id: dto.assignedUserId, companyId } });
      if (!user) throw new NotFoundException('담당자를 찾을 수 없습니다.');
    }

    return this.prisma.workOrder.create({
      data: {
        clientUuid: dto.clientUuid,
        siteId: dto.siteId,
        equipmentId: dto.equipmentId,
        assignedUserId: dto.assignedUserId,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  // 오프라인 앱은 서버 id 대신 clientUuid로 작업을 가리킨다.
  async findByClientUuid(companyId: string, clientUuid: string) {
    const workOrder = await this.prisma.workOrder.findFirst({ where: { clientUuid, site: { companyId } } });
    if (!workOrder) throw new NotFoundException('작업을 찾을 수 없습니다.');
    return workOrder;
  }

  async update(companyId: string, id: string, dto: UpdateWorkOrderDto) {
    await this.findOne(companyId, id);
    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async addRecord(companyId: string, workOrderId: string, dto: CreateWorkRecordDto) {
    await this.findOne(companyId, workOrderId);
    if (dto.clientUuid) {
      const existing = await this.prisma.workRecord.findUnique({ where: { clientUuid: dto.clientUuid } });
      if (existing) return this.sameOrder(existing, workOrderId);
    }
    return this.prisma.workRecord.create({ data: { workOrderId, ...dto } });
  }

  async addAttachment(companyId: string, workOrderId: string, dto: CreateAttachmentDto) {
    await this.findOne(companyId, workOrderId);
    if (dto.clientUuid) {
      const existing = await this.prisma.attachment.findUnique({ where: { clientUuid: dto.clientUuid } });
      if (existing) return this.sameOrder(existing, workOrderId);
    }
    return this.prisma.attachment.create({ data: { workOrderId, ...dto } });
  }

  // 재전송이면 기존 행을 그대로 돌려주되, 다른 작업/회사의 행이면 거부한다.
  private sameOrder<T extends { workOrderId: string }>(row: T, workOrderId: string): T {
    if (row.workOrderId !== workOrderId) throw new ConflictException('이미 사용된 clientUuid입니다.');
    return row;
  }
}
