import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';
import { EquipmentService } from '../equipment/equipment.service';
import { PUBLIC_USER_SELECT } from '../users/users.service';
import { CreateReportDto } from './dto/create-report.dto';
import { findMissing } from './missing-fields';

type Content = Record<string, string | null>;

// 보고서 흐름: DRAFT -> AI_GENERATED -> REVIEW -> APPROVED -> GENERATED (설계서 7.2)
const EDITABLE = ['DRAFT', 'AI_GENERATED', 'REVIEW'];
const APPROVABLE = ['AI_GENERATED', 'REVIEW'];
const PDF_READY = ['APPROVED', 'GENERATED'];

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
    private attachments: AttachmentsService,
    private audit: AuditService,
    private ai: AiService,
    private equipment: EquipmentService,
  ) {}

  findAll(companyId: string) {
    return this.prisma.report.findMany({
      where: { workOrder: { site: { companyId } } },
      include: { workOrder: true, template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const report = await this.prisma.report.findFirst({
      where: { id, workOrder: { site: { companyId } } },
      include: {
        workOrder: { include: { site: true, assignedWorker: { select: PUBLIC_USER_SELECT }, workRecords: true, attachments: true } },
        template: { include: { templateFields: true } },
      },
    });
    if (!report) throw new NotFoundException('보고서를 찾을 수 없습니다.');
    return report;
  }

  async create(companyId: string, dto: CreateReportDto) {
    const template = await this.prisma.reportTemplate.findFirst({ where: { id: dto.templateId, companyId } });
    if (!template) throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    const workOrder = await this.prisma.workOrder.findFirst({ where: { id: dto.workOrderId, site: { companyId } } });
    if (!workOrder) throw new NotFoundException('작업을 찾을 수 없습니다.');
    if (workOrder.status === 'CANCELLED') throw new BadRequestException('취소된 작업에는 보고서를 만들 수 없습니다.');

    return this.prisma.report.create({
      data: { workOrderId: dto.workOrderId, templateId: dto.templateId, status: 'DRAFT' },
    });
  }

  // 승인 전(초안·AI 초안·검토중) 보고서만 삭제할 수 있다. 승인본은 증빙이라 남기고, 바꿀 때는 새 버전으로 (설계서 3.4).
  async remove(companyId: string, id: string, actorId: string) {
    const report = await this.findOne(companyId, id);
    this.assertDeletable(report.status);
    await this.prisma.report.delete({ where: { id } });
    await this.audit.log(companyId, actorId, 'delete', 'report', id);
    return { deleted: true };
  }

  // 현장 기록 원문 + 설비 이력 Context -> AI 구조화 -> 보고서 초안 (설계서 6.1, 6.5).
  // 다시 호출하면 초안을 새로 만든다. 이력은 ai_generations에 남는다.
  async draftWithAi(companyId: string, id: string) {
    const report = await this.findOne(companyId, id);
    this.assertEditable(report.status);

    const { workOrder } = report;
    const text = workOrder.workRecords
      .map((r: { description: string | null; issue: string | null; action: string | null; result: string | null }) =>
        [r.description, r.issue, r.action, r.result].filter(Boolean).join(' '),
      )
      .filter(Boolean)
      .join('\n');
    if (!text) throw new BadRequestException('구조화할 작업 기록이 없습니다.');

    const equipmentContext = workOrder.equipmentId
      ? await this.equipment.buildContext(companyId, workOrder.equipmentId, workOrder.id)
      : undefined;

    const { model, output } = await this.ai.structure({ text, equipmentContext });
    await this.prisma.aiGeneration.create({ data: { reportId: id, model, inputText: text, outputJson: output } });
    return this.prisma.report.update({ where: { id }, data: { content: output, status: 'AI_GENERATED' } });
  }

  // 관리자가 초안을 고친다. 템플릿에 정의된 텍스트 필드만 수정할 수 있다.
  async updateContent(companyId: string, id: string, patch: Content) {
    const report = await this.findOne(companyId, id);
    this.assertEditable(report.status);

    const editable = new Set(
      report.template.templateFields
        .filter((f: { fieldType: string }) => f.fieldType !== 'photo')
        .map((f: { fieldKey: string }) => f.fieldKey),
    );
    for (const [key, value] of Object.entries(patch)) {
      if (!editable.has(key)) throw new BadRequestException(`템플릿에 없는 필드입니다: ${key}`);
      if (value !== null && typeof value !== 'string') throw new BadRequestException(`문자열만 입력할 수 있습니다: ${key}`);
    }

    const content = { ...((report.content as Content | null) ?? {}), ...patch };
    return this.prisma.report.update({ where: { id }, data: { content, status: 'REVIEW' } });
  }

  async checkMissing(companyId: string, id: string) {
    const report = await this.findOne(companyId, id);
    const missing = this.missingOf(report);
    return { reportId: id, missing, isComplete: missing.length === 0 };
  }

  // 누락이 없어야 승인할 수 있다. 승인되면 작업 결과가 설비 이력이 되어 다음 작업의 Context로 쓰인다.
  async approve(companyId: string, id: string, approvedById: string) {
    const report = await this.findOne(companyId, id);
    if (!APPROVABLE.includes(report.status)) {
      throw new ConflictException('AI 초안을 만든 뒤에만 승인할 수 있습니다.');
    }
    const missing = this.missingOf(report);
    if (missing.length > 0) {
      throw new BadRequestException({
        message: `필수 항목이 누락되어 승인할 수 없습니다: ${missing.join(', ')}`,
        missing,
      });
    }

    const approved = await this.prisma.report.update({
      where: { id },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    });

    const { workOrder } = report;
    if (workOrder.equipmentId) {
      await this.equipment.recordHistory(
        workOrder.equipmentId,
        workOrder.id,
        summarize((report.content as Content | null) ?? {}),
        approved.approvedAt ?? new Date(),
      );
    }
    await this.audit.log(companyId, approvedById, 'approve', 'report', id);
    return approved;
  }

  // 승인된 내용으로만 PDF를 만든다 (설계서 5.2, 9.2). 승인 이후 내용 변경은 새 버전으로 (설계서 3.4).
  async generatePdf(companyId: string, id: string) {
    const report = await this.findOne(companyId, id);
    if (!PDF_READY.includes(report.status)) throw new ConflictException('승인된 보고서만 PDF로 만들 수 있습니다.');

    const { workOrder } = report;
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const data = {
      customer_name: workOrder.site.customerName,
      site_name: workOrder.site.name,
      worker: workOrder.assignedWorker?.name,
      work_date: (workOrder.scheduledAt ?? workOrder.createdAt).toISOString().slice(0, 10),
      ...((report.content as Content | null) ?? {}),
    };

    const html = this.pdf.buildHtml(company?.name ?? '', report.template.reportType, report.template.sections, data);
    const buffer = await this.pdf.renderToPdfBuffer(html);
    const pdfUrl = await this.attachments.uploadBuffer(companyId, buffer, 'application/pdf');

    return this.prisma.report.update({ where: { id }, data: { status: 'GENERATED', pdfUrl } });
  }

  private assertDeletable(status: string) {
    if (!EDITABLE.includes(status)) throw new ConflictException('승인된 보고서는 삭제할 수 없습니다.');
  }

  private assertEditable(status: string) {
    if (!EDITABLE.includes(status)) {
      throw new ConflictException('승인된 보고서는 수정할 수 없습니다. 새 버전으로 생성하세요.');
    }
  }

  private missingOf(report: Awaited<ReturnType<ReportsService['findOne']>>) {
    return findMissing(
      report.template.templateFields,
      report.content as Content | null,
      report.workOrder.attachments.map((a: { type: string }) => a.type),
    );
  }
}

/** 설비 이력에 남길 한 줄 요약: "이슈 → 조치 → 결과" (없으면 작업 설명). */
function summarize(content: Content): string {
  const parts = [content.issue, content.action, content.result].filter((v): v is string => !!v?.trim());
  return parts.length > 0 ? parts.join(' → ') : content.description?.trim() ?? '';
}
