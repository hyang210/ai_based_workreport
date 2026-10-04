import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LOCKED_REPORT_STATUSES } from '../reports/report-status';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.site.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const site = await this.prisma.site.findFirst({ where: { id, companyId } });
    if (!site) throw new NotFoundException('현장을 찾을 수 없습니다.');
    return site;
  }

  create(companyId: string, dto: CreateSiteDto) {
    return this.prisma.site.create({ data: { ...dto, companyId } });
  }

  async update(companyId: string, id: string, dto: UpdateSiteDto) {
    await this.findOne(companyId, id); // 테넌트 경계 + 존재 확인
    return this.prisma.site.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    // 현장을 지우면 작업·보고서까지 cascade로 지워진다. 승인된 보고서(증빙)가 있으면 막는다.
    const locked = await this.prisma.report.count({
      where: { workOrder: { siteId: id }, status: { in: LOCKED_REPORT_STATUSES } },
    });
    if (locked > 0) throw new ConflictException('승인된 보고서가 있는 현장은 삭제할 수 없습니다.');
    return this.prisma.site.delete({ where: { id } });
  }
}
