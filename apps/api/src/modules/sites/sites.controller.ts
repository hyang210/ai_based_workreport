import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sites')
export class SitesController {
  constructor(private sitesService: SitesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.sitesService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sitesService.findOne(user.companyId, id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSiteDto) {
    return this.sitesService.create(user.companyId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return this.sitesService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.sitesService.remove(user.companyId, id);
  }
}
