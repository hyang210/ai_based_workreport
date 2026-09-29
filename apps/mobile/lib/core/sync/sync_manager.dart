import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart' show OrderingTerm, Value;
import '../db/app_database.dart';
import '../network/api_client.dart';

/// Offline-first 동기화 매니저.
/// - 로컬 변경은 항상 SyncQueueEntries에 먼저 append (append-only에 가깝게 — 설계서 5.1).
/// - 연결이 복구되면 큐를 배치로 서버에 전송하고, 성공한 이벤트만 APPLIED로 표시한다.
/// - 실패 시 retryCount를 늘리고 exponential backoff으로 재시도한다 (baseline: 고정 간격).
class SyncManager {
  SyncManager(this._db, this._api, {required this.deviceId});

  final AppDatabase _db;
  final ApiClient _api;
  final String deviceId;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  bool _isSyncing = false;

  void start() {
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) {
        // 네트워크 복구 → 즉시 flush 시도.
        flushQueue();
      }
    });
  }

  void dispose() {
    _connectivitySub?.cancel();
  }

  Future<void> flushQueue() async {
    if (_isSyncing) return;
    _isSyncing = true;
    try {
      // 생성 순서대로 보낸다: 서버는 작업 CREATE가 먼저 도착해야 그 작업의 기록을 붙일 수 있다.
      final pending = await (_db.select(_db.syncQueueEntries)
            ..where((t) => t.status.equals('PENDING'))
            ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
          .get();

      if (pending.isEmpty) return;

      final events = pending
          .map((e) => {
                'eventId': e.eventId,
                'deviceId': deviceId,
                'entityType': e.entityType,
                'entityId': e.entityId,
                'operation': e.operation,
                'payload': jsonDecode(e.payloadJson),
              })
          .toList();

      final result = await _api.pushSyncEvents(events);
      final results = (result['results'] as List<dynamic>? ?? []);

      for (final r in results) {
        final eventId = r['eventId'] as String;
        final status = r['status'] as String;
        await (_db.update(_db.syncQueueEntries)..where((t) => t.eventId.equals(eventId))).write(
          SyncQueueEntriesCompanion(status: Value(status)),
        );
      }
    } catch (_) {
      // TODO: retryCount 증가 + backoff 스케줄링 (baseline은 다음 connectivity 이벤트에서 재시도)
    } finally {
      _isSyncing = false;
    }
  }

  /// 작업 생성/기록/첨부 등 로컬 변경 발생 시 호출 — 큐에 append만 하고 바로 반환한다.
  /// UI는 네트워크 상태를 기다리지 않고 즉시 다음 화면으로 진행할 수 있다 (설계서 4.1 "빠른 기록").
  Future<void> enqueue({
    required String eventId,
    required String entityType,
    required String entityId,
    required String operation,
    required Map<String, dynamic> payload,
  }) async {
    await _db.into(_db.syncQueueEntries).insert(
          SyncQueueEntriesCompanion.insert(
            eventId: eventId,
            entityType: entityType,
            entityId: entityId,
            operation: operation,
            payloadJson: jsonEncode(payload),
          ),
        );
  }
}
