import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { AuditService } from '../audit/audit.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private pdf: PdfService,
    private attachments: AttachmentsService,
    private audit: AuditService,
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
      include: { workOrder: { include: { workRecords: true } }, template: true },
    });
    if (!report) throw new NotFoundException('보고서를 찾을 수 없습니다.');
    return report;
  }

  async create(companyId: string, dto: CreateReportDto) {
    const template = await this.prisma.reportTemplate.findFirst({ where: { id: dto.templateId, companyId } });
    if (!template) throw new NotFoundException('템플릿을 찾을 수 없습니다.');

    return this.prisma.report.create({
      data: { workOrderId: dto.workOrderId, templateId: dto.templateId, status: 'DRAFT' },
    });
  }

  // AI 구조화 결과를 보고서에 반영 + 이력 저장 (설계서 6.1, 7.0 ai_generations).
  async recordAiGeneration(reportId: string, model: string, inputText: string, outputJson: Record<string, unknown>) {
    await this.prisma.report.update({ where: { id: reportId }, data: { status: 'AI_GENERATED' } });
    return this.prisma.aiGeneration.create({ data: { reportId, model, inputText, outputJson: outputJson as any } });
  }

  async approve(companyId: string, id: string, approvedById: string) {
    await this.findOne(companyId, id);
    const report = await this.prisma.report.update({
      where: { id },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    });
    await this.audit.log(companyId, approvedById, 'approve', 'report', id);
    return report;
  }

  // HTML/CSS → PDF 렌더링 후 Object Storage 업로드, status를 GENERATED로 전환 (설계서 5.2, 9.2).
  // 최종 승인 이후 재생성은 새 버전으로 만든다 (설계서 3.4).
  async generatePdf(companyId: string, id: string) {
    const report = await this.findOne(companyId, id);
    const html = this.pdf.buildHtml(
      companyId,
      report.template.reportType,
      report.template.sections,
      Object.fromEntries(
        report.workOrder.workRecords.flatMap((r: Record<string, unknown>) => Object.entries(r)),
      ),
    );
    const buffer = await this.pdf.renderToPdfBuffer(html);
    const pdfUrl = await this.attachments.uploadBuffer(companyId, buffer, 'application/pdf');

    return this.prisma.report.update({
      where: { id },
      data: { status: 'GENERATED', pdfUrl },
    });
  }
}
