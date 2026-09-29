import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// API_URL은 빌드 시 --dart-define=API_URL=... 로 주입한다 (기본값: 로컬 개발 서버).
const _defaultApiUrl = 'http://localhost:4000/api';

class ApiClient {
  ApiClient() : dio = Dio(BaseOptions(baseUrl: const String.fromEnvironment('API_URL', defaultValue: _defaultApiUrl))) {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final Dio dio;
  final _storage = const FlutterSecureStorage();

  Future<void> saveToken(String token) => _storage.write(key: 'access_token', value: token);
  Future<void> clearToken() => _storage.delete(key: 'access_token');

  // ── Auth ──────────────────────────────────────
  Future<String> login(String email, String password) async {
    final res = await dio.post('/auth/login', data: {'email': email, 'password': password});
    final token = res.data['accessToken'] as String;
    await saveToken(token);
    return token;
  }

  // ── Sync (설계서 5.1, apps/api SyncModule과 동일 계약) ──
  Future<Map<String, dynamic>> pushSyncEvents(List<Map<String, dynamic>> events) async {
    final res = await dio.post('/sync/events', data: {'events': events});
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> pullSyncEvents(String deviceId, {String? cursor}) async {
    final res = await dio.get('/sync/pull', queryParameters: {'deviceId': deviceId, if (cursor != null) 'cursor': cursor});
    return res.data as Map<String, dynamic>;
  }

  // ── Work orders ───────────────────────────────
  Future<List<dynamic>> fetchWorkOrders() async {
    final res = await dio.get('/work-orders');
    return res.data as List<dynamic>;
  }

  // ── Attachments ───────────────────────────────
  Future<Map<String, dynamic>> requestPresignedUpload(String contentType) async {
    final res = await dio.post('/attachments/presigned-upload', data: {'contentType': contentType});
    return res.data as Map<String, dynamic>;
  }
}
