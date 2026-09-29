import { Injectable, NotFoundException } from '@nestjs/common';
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
    const site = await this.prisma.site.findFirst({ where: { id: dto.siteId, companyId } });
    if (!site) throw new NotFoundException('현장을 찾을 수 없습니다.');

    // 동일 clientUuid로 재전송된 경우 새로 만들지 않고 기존 레코드를 반환 (idempotency).
    const existing = await this.prisma.workOrder.findUnique({ where: { clientUuid: dto.clientUuid } });
    if (existing) return existing;

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
    return this.prisma.workRecord.create({ data: { workOrderId, ...dto } });
  }

  async addAttachment(companyId: string, workOrderId: string, dto: CreateAttachmentDto) {
    await this.findOne(companyId, workOrderId);
    return this.prisma.attachment.create({ data: { workOrderId, ...dto } });
  }

  // 누락/불완전 기록 검증 (설계서 4장, 16장) — 제출 전 필수 항목 체크.
  // MVP baseline: 사진 첨부 여부 + 최소 1개의 work record 존재 여부만 확인.
  // 템플릿의 required 필드 검증은 templates 모듈과 연계해 이후 채운다.
  async checkMissingFields(companyId: string, workOrderId: string) {
    const workOrder = await this.findOne(companyId, workOrderId);
    const missing: string[] = [];

    if (workOrder.workRecords.length === 0) missing.push('작업 내용(work_records)');
    if (workOrder.attachments.length === 0) missing.push('증빙 사진(attachments)');

    return { workOrderId, missing, isComplete: missing.length === 0 };
  }
}
