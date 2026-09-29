import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

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
