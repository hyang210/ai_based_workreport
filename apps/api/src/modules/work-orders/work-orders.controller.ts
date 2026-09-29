import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { CreateWorkRecordDto } from './dto/create-work-record.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private workOrdersService: WorkOrdersService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('siteId') siteId?: string, @Query('status') status?: string) {
    return this.workOrdersService.findAll(user.companyId, { siteId, status });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workOrdersService.findOne(user.companyId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.create(user.companyId, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateWorkOrderDto) {
    return this.workOrdersService.update(user.companyId, id, dto);
  }

  @Post(':id/records')
  addRecord(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateWorkRecordDto) {
    return this.workOrdersService.addRecord(user.companyId, id, dto);
  }

  @Post(':id/attachments')
  addAttachment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: CreateAttachmentDto) {
    return this.workOrdersService.addAttachment(user.companyId, id, dto);
  }
}
