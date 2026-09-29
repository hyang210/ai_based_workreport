import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushSyncEventsDto } from './dto/sync-event.dto';

// 오프라인 동기화 큐 처리 (설계서 5.1).
// baseline: 이벤트를 멱등하게 기록만 한다. 실제 엔티티 upsert 로직(각 도메인 서비스 호출,
// 충돌 정책 적용)은 이후 도메인별로 확장한다.
@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  async pushEvents(dto: PushSyncEventsDto) {
    const results = [];
    for (const event of dto.events) {
      // eventId 기준 idempotency: 이미 처리된 이벤트면 그대로 ACK만 반환.
      const existing = await this.prisma.syncEvent.findUnique({ where: { eventId: event.eventId } });
      if (existing) {
        results.push({ eventId: event.eventId, status: existing.status });
        continue;
      }

      const saved = await this.prisma.syncEvent.create({
        data: {
          eventId: event.eventId,
          deviceId: event.deviceId,
          entityType: event.entityType,
          entityId: event.entityId,
          operation: event.operation,
          payload: event.payload as any,
          status: 'APPLIED', // TODO: 실제 적용 로직 연결 후 PENDING → APPLIED/FAILED 전이로 교체
          processedAt: new Date(),
        },
      });
      results.push({ eventId: saved.eventId, status: saved.status });
    }
    return { results };
  }

  async pull(deviceId: string, cursor?: string) {
    // baseline: cursor 이후 생성된 이벤트를 시간순으로 반환.
    const events = await this.prisma.syncEvent.findMany({
      where: {
        deviceId: { not: deviceId }, // 자기 자신이 보낸 이벤트는 되돌려주지 않음
        ...(cursor ? { createdAt: { gt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    const nextCursor = events.length > 0 ? events[events.length - 1].createdAt.toISOString() : cursor ?? null;
    return { events, nextCursor };
  }
}
