import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'dart:io';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

/// 서버 work_orders 테이블의 로컬 미러 (설계서 7장, 5.1 Offline-first).
/// 서버가 발급하는 id는 동기화 이후에만 채워지고, 그 전까지는 clientUuid로 식별한다.
class LocalWorkOrders extends Table {
  TextColumn get clientUuid => text()(); // primary key, offline에서 생성
  TextColumn get serverId => text().nullable()();
  TextColumn get siteId => text()();
  TextColumn get equipmentId => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('OPEN'))();
  DateTimeColumn get scheduledAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {clientUuid};
}

/// 현장 기록 원본 (구조화 이전 텍스트/음성 전사) — work_records 미러.
class LocalWorkRecords extends Table {
  TextColumn get id => text()(); // uuid, client 생성
  TextColumn get workOrderClientUuid => text()();
  TextColumn get description => text().nullable()();
  TextColumn get issue => text().nullable()();
  TextColumn get action => text().nullable()();
  TextColumn get result => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// 사진/음성 첨부파일 로컬 메타데이터. 실제 바이너리는 로컬 파일 경로에 두고,
/// 동기화 시 presigned URL로 업로드한 뒤 fileUrl을 서버 URL로 교체한다.
class LocalAttachments extends Table {
  TextColumn get id => text()();
  TextColumn get workOrderClientUuid => text()();
  TextColumn get type => text()(); // PHOTO_BEFORE / PHOTO_AFTER / VOICE ...
  TextColumn get localFilePath => text()();
  TextColumn get remoteFileUrl => text().nullable()();
  BoolColumn get uploaded => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}

/// Sync Queue — 네트워크 복구 시 서버로 전송할 변경사항 (설계서 5.1).
/// eventId를 서버가 idempotency key로 사용하므로 클라이언트에서 uuid로 미리 생성한다.
class SyncQueueEntries extends Table {
  TextColumn get eventId => text()();
  TextColumn get entityType => text()(); // work_order / work_record / attachment
  TextColumn get entityId => text()();
  TextColumn get operation => text()(); // CREATE / UPDATE / DELETE
  TextColumn get payloadJson => text()();
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {eventId};
}

@DriftDatabase(tables: [LocalWorkOrders, LocalWorkRecords, LocalAttachments, SyncQueueEntries])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'workreport.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
