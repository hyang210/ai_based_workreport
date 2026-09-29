import { IsString } from 'class-validator';

export class CreateReportDto {
  @IsString()
  workOrderId: string;

  @IsString()
  templateId: string;
}
