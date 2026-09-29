import { IsObject } from 'class-validator';

// 관리자가 AI 초안을 수정할 때 쓴다. 키는 템플릿 필드 키, 값은 문자열 또는 null.
export class UpdateReportContentDto {
  @IsObject()
  content: Record<string, string | null>;
}
