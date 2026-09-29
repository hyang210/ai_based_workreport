import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private equipmentService: EquipmentService) {}

  @Get()
  findAllForSite(@CurrentUser() user: AuthUser, @Query('siteId') siteId: string) {
    return this.equipmentService.findAllForSite(user.companyId, siteId);
  }

  // QR 스캔으로 설비 자동 식별 (설계서 12.3 향후 확장).
  @Get('by-qr/:qrCode')
  findByQrCode(@CurrentUser() user: AuthUser, @Param('qrCode') qrCode: string) {
    return this.equipmentService.findByQrCode(user.companyId, qrCode);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.equipmentService.findOne(user.companyId, id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEquipmentDto) {
    return this.equipmentService.create(user.companyId, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipmentService.update(user.companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.equipmentService.remove(user.companyId, id);
  }
}
