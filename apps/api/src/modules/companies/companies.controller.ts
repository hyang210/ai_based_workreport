import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

// 회사 ID는 JWT에서 파생 — URL/바디로 임의의 companyId를 받지 않는다 (테넌트 격리, 설계서 8장).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('company')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get()
  getMyCompany(@CurrentUser() user: AuthUser) {
    return this.companiesService.findOne(user.companyId);
  }

  @Patch()
  @Roles('ADMIN')
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(user.companyId, dto);
  }
}
