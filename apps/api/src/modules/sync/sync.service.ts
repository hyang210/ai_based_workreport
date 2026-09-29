import { HttpException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { CreateWorkOrderDto } from '../work-orders/dto/create-work-order.dto';
import { UpdateWorkOrderDto } from '../work-orders/dto/update-work-order.dto';
import { CreateWorkRecordDto } from '../work-orders/dto/create-work-record.dto';
import { CreateAttachmentDto } from '../work-orders/dto/create-attachment.dto';
import { PushSyncEventsDto, SyncEventItemDto } from './dto/sync-event.dto';

// 오프라인 동기화 처리 (설계서 5.1).
//
// 이벤트 계약: entityId = 그 엔티티의 clientUuid.
//   work_order  CREATE  payload { siteId, equipmentId?, assignedUserId?, scheduledAt? }
//   work_order  UPDATE  payload { status }
//   work_record CREATE  payload { workOrderClientUuid, description?, issue?, action?, result? }
//   attachment  CREATE  payload { workOrderClientUuid, type, fileUrl }
//
// 충돌 정책 (엔티티별):
//   work_order  : 서버가 이미 COMPLETED/CANCELLED면 서버값 우선 (기기의 상태 변경 거부)
//   work_record : append-only. 수정/삭제 이벤트는 거부
//   attachment  : append-only. 수정/삭제 이벤트는 거부
//
// 모든 핸들러가 clientUuid 기준으로 멱등이라, sync_events는 "처리 결과 ACK 캐시" 역할만 한다.
// 그래서 적용과 기록을 하나의 트랜잭션으로 묶지 않아도, 중간에 죽고 재전송돼도 중복이 생기지 않는다.

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED']);

/** 재시도해도 결과가 같은, 예상된 거부 (검증 실패·정책 위반). FAILED로 기록한다. */
class SyncRejected extends Error {}

type SyncResult = { eventId: string; status: 'APPLIED' | 'FAILED'; error?: string };

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService, private workOrders: WorkOrdersService) {}

  async pushEvents(companyId: string, dto: PushSyncEventsDto) {
    const results: SyncResult[] = [];
    // 순서 보장이 중요하므로(작업 생성 → 기록 추가) 직렬 처리한다.
    for (const event of dto.events) {
      results.push(await this.processOne(companyId, event));
    }
    return { results };
  }

  async pull(companyId: string, deviceId: string, cursor?: string) {
    const events = await this.prisma.syncEvent.findMany({
      where: {
        companyId,
        deviceId: { not: deviceId }, // 자기 자신이 보낸 이벤트는 되돌려주지 않음
        status: 'APPLIED',
        ...(cursor ? { createdAt: { gt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    const nextCursor = events.length > 0 ? events[events.length - 1].createdAt.toISOString() : cursor ?? null;
    return { events, nextCursor };
  }

  private async processOne(companyId: string, event: SyncEventItemDto): Promise<SyncResult> {
    const existing = await this.prisma.syncEvent.findUnique({ where: { eventId: event.eventId } });
    if (existing) {
      if (existing.companyId !== companyId) {
        return { eventId: event.eventId, status: 'FAILED', error: '이미 사용된 eventId입니다.' };
      }
      return this.toResult(existing);
    }

    let status: 'APPLIED' | 'FAILED' = 'APPLIED';
    let error: string | undefined;
    try {
      await this.apply(companyId, event);
    } catch (e) {
      // 검증/정책/도메인 거부(HttpException)만 FAILED로 기록. DB 장애 같은 예기치 못한 오류는
      // 기록하지 않고 그대로 던져서 클라이언트가 같은 이벤트를 다시 보내게 한다.
      if (!(e instanceof SyncRejected) && !(e instanceof HttpException)) throw e;
      status = 'FAILED';
      error = e.message;
    }

    await this.prisma.syncEvent.create({
      data: {
        eventId: event.eventId,
        companyId,
        deviceId: event.deviceId,
        entityType: event.entityType,
        entityId: event.entityId,
        operation: event.operation,
        payload: event.payload as any,
        status,
        error,
        processedAt: new Date(),
      },
    });
    return { eventId: event.eventId, status, error };
  }

  private toResult(e: { eventId: string; status: string; error: string | null }): SyncResult {
    return { eventId: e.eventId, status: e.status as SyncResult['status'], ...(e.error ? { error: e.error } : {}) };
  }

  private async apply(companyId: string, e: SyncEventItemDto): Promise<void> {
    switch (`${e.entityType}:${e.operation}`) {
      case 'work_order:CREATE': {
        const dto = await parse(CreateWorkOrderDto, { ...e.payload, clientUuid: e.entityId });
        await this.workOrders.create(companyId, dto);
        return;
      }
      case 'work_order:UPDATE': {
        const order = await this.workOrders.findByClientUuid(companyId, e.entityId);
        const dto = await parse(UpdateWorkOrderDto, { status: e.payload.status });
        if (!dto.status) throw new SyncRejected('status가 필요합니다.');
        if (TERMINAL_STATUSES.has(order.status) && order.status !== dto.status) {
          throw new SyncRejected(`서버에서 이미 ${order.status} 상태입니다 (서버 값 우선).`);
        }
        await this.workOrders.update(companyId, order.id, { status: dto.status });
        return;
      }
      case 'work_record:CREATE': {
        const order = await this.resolveOrder(companyId, e);
        const dto = await parse(CreateWorkRecordDto, { ...e.payload, clientUuid: e.entityId });
        await this.workOrders.addRecord(companyId, order.id, dto);
        return;
      }
      case 'attachment:CREATE': {
        const order = await this.resolveOrder(companyId, e);
        const dto = await parse(CreateAttachmentDto, { ...e.payload, clientUuid: e.entityId });
        await this.workOrders.addAttachment(companyId, order.id, dto);
        return;
      }
      default:
        // work_record/attachment의 UPDATE·DELETE(append-only 정책)와 알 수 없는 조합
        throw new SyncRejected(`지원하지 않는 이벤트입니다: ${e.entityType} ${e.operation}`);
    }
  }

  private resolveOrder(companyId: string, e: SyncEventItemDto) {
    const uuid = e.payload.workOrderClientUuid;
    if (typeof uuid !== 'string') throw new SyncRejected('workOrderClientUuid가 필요합니다.');
    return this.workOrders.findByClientUuid(companyId, uuid);
  }
}

/** REST 엔드포인트와 같은 DTO 검증 규칙을 payload에도 그대로 적용한다. */
async function parse<T extends object>(cls: new () => T, plain: unknown): Promise<T> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, { whitelist: true });
  if (errors.length > 0) {
    throw new SyncRejected(errors.flatMap((err) => Object.values(err.constraints ?? {})).join(', '));
  }
  return instance;
}
