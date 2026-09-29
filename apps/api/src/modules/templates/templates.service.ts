import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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
    return this.prisma.reportTemplate.delete({ where: { id } });
  }
}
