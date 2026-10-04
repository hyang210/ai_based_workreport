import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LOCKED_REPORT_STATUSES } from '../reports/report-status';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.reportTemplate.findMany({
      where: { companyId },
      include: { templateFields: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { id, companyId },
      include: { templateFields: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!template) throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    return template;
  }

  create(companyId: string, dto: CreateTemplateDto) {
    return this.prisma.reportTemplate.create({
      data: {
        companyId,
        name: dto.name,
        reportType: dto.reportType,
        sections: dto.sections as any,
        version: dto.version ?? 1,
        templateFields: dto.fields
          ? { create: dto.fields.map((f) => ({ ...f, required: f.required ?? false, sortOrder: f.sortOrder ?? 0 })) }
          : undefined,
      },
      include: { templateFields: true },
    });
  }

  async update(companyId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOne(companyId, id);
    // 승인된 보고서는 이 템플릿의 필드·섹션으로 누락 판정과 PDF가 만들어진다. 구조가 바뀌면 증빙이 달라지므로
    // 그런 보고서가 있으면 구조 변경을 막고 새 템플릿(버전)을 만들게 한다. 이름 등 표시용 값은 바꿀 수 있다.
    if ((dto.fields || dto.sections) && (await this.hasLockedReports(id))) {
      throw new ConflictException('승인된 보고서가 사용 중인 템플릿은 필드·섹션을 바꿀 수 없습니다. 새 버전으로 만드세요.');
    }
    // 필드 목록 갱신은 기존 필드를 지우고 새로 넣는 단순한 전략을 사용한다 (baseline).
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (dto.fields) {
        await tx.templateField.deleteMany({ where: { templateId: id } });
      }
      return tx.reportTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          reportType: dto.reportType,
          sections: dto.sections as any,
          version: dto.version,
          templateFields: dto.fields
            ? { create: dto.fields.map((f) => ({ ...f, required: f.required ?? false, sortOrder: f.sortOrder ?? 0 })) }
            : undefined,
        },
        include: { templateFields: true },
      });
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    // 보고서가 참조 중이면 FK 제약으로 지울 수 없다 — 500 대신 이유를 알려준다.
    const inUse = await this.prisma.report.count({ where: { templateId: id } });
    if (inUse > 0) throw new ConflictException('이 템플릿으로 만든 보고서가 있어 삭제할 수 없습니다.');
    return this.prisma.reportTemplate.delete({ where: { id } });
  }

  private async hasLockedReports(templateId: string) {
    return (await this.prisma.report.count({ where: { templateId, status: { in: LOCKED_REPORT_STATUSES } } })) > 0;
  }
}
