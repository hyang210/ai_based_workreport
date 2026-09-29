import { IsOptional, IsString, IsUUID } from 'class-validator';

// clientUuid는 Flutter 앱이 오프라인 상태에서 생성한 UUID.
// 서버는 이 값을 idempotency key로 사용해 재전송 시 중복 생성을 막는다 (설계서 5.1 동기화 원칙).
export class CreateWorkOrderDto {
  @IsUUID()
  clientUuid: string;

  @IsString()
  siteId: string;

  @IsOptional()
  @IsString()
  equipmentId?: string;

  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
