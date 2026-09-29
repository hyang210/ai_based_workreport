import { Type } from 'class-transformer';
import { IsArray, IsIn, IsObject, IsString, IsUUID, ValidateNested } from 'class-validator';

export class SyncEventItemDto {
  @IsUUID()
  eventId: string; // 클라이언트가 생성 — idempotency key

  @IsString()
  deviceId: string;

  @IsString()
  entityType: string; // work_order / work_record / attachment ...

  @IsString()
  entityId: string;

  @IsIn(['CREATE', 'UPDATE', 'DELETE'])
  operation: 'CREATE' | 'UPDATE' | 'DELETE';

  @IsObject()
  payload: Record<string, unknown>;
}

export class PushSyncEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventItemDto)
  events: SyncEventItemDto[];
}
