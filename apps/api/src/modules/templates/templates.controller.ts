import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.templatesService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.findOne(user.companyId, id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.companyId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.remove(user.companyId, id);
  }
}
