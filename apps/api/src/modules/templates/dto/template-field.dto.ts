import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class TemplateFieldDto {
  @IsString()
  fieldKey: string;

  @IsString()
  fieldType: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
