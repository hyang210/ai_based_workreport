import { IsOptional, IsString, IsUUID } from 'class-validator';

// 현장 기록 원본 (구조화 이전). AI 구조화는 별도로 /api/ai/structure 호출 후
// description/issue/action/result를 채워 넣는 흐름 (설계서 6.1).
export class CreateWorkRecordDto {
  // 오프라인 앱이 발급한 UUID. 같은 값으로 재전송되면 중복 생성하지 않는다.
  @IsOptional()
  @IsUUID()
  clientUuid?: string;

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
