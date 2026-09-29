import { Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TemplateFieldDto } from './template-field.dto';

// sections는 설계서 6.3의 동적 템플릿 구조( { title, fields[] }[] )를 그대로 JSONB로 저장한다.
// 템플릿을 코드에 하드코딩하지 않기 위함 — 회사마다 다른 필드/순서를 지원.
export class CreateTemplateDto {
  @IsString()
  name: string;

  @IsString()
  reportType: string;

  @IsObject()
  sections: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  version?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldDto)
  fields?: TemplateFieldDto[];
}
