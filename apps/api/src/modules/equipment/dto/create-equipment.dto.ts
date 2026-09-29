import { IsOptional, IsString } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  siteId: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  qrCode?: string;
}
