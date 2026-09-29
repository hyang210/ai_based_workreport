import { IsOptional, IsString } from 'class-validator';

// 현장 기록 원본 (구조화 이전). AI 구조화는 별도로 /api/ai/structure 호출 후
// description/issue/action/result를 채워 넣는 흐름 (설계서 6.1).
export class CreateWorkRecordDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  issue?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  result?: string;
}
