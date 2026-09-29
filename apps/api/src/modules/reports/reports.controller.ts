import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportContentDto } from './dto/update-report-content.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.reportsService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.companyId, dto);
  }

  // 현장 기록 + 설비 이력 Context -> AI 구조화 -> 초안
  @Post(':id/ai-draft')
  draftWithAi(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.draftWithAi(user.companyId, id);
  }

  @Patch(':id/content')
  @Roles('ADMIN', 'MANAGER')
  updateContent(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateReportContentDto) {
    return this.reportsService.updateContent(user.companyId, id, dto.content);
  }

  @Get(':id/missing-fields')
  checkMissing(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.checkMissing(user.companyId, id);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.approve(user.companyId, id, user.id);
  }

  @Post(':id/generate')
  generate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.reportsService.generatePdf(user.companyId, id);
  }

  @Get(':id/pdf')
  async getPdfUrl(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const report = await this.reportsService.findOne(user.companyId, id);
    return { pdfUrl: report.pdfUrl };
  }
}
