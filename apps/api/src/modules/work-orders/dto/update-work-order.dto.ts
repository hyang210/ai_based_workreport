import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WorkOrderStatus } from '@prisma/client';

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
