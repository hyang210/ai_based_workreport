import 'package:flutter/material.dart';

/// 동기화 상태 화면 — Sync Queue의 PENDING/FAILED 건수를 보여준다 (설계서 5.1).
/// 작업자가 "내가 입력한 게 서버로 잘 올라갔는지" 불안해하지 않도록,
/// 대기중/실패 건수와 마지막 동기화 시각을 항상 노출한다.
class SyncStatusScreen extends StatelessWidget {
  const SyncStatusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('동기화 상태')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          ListTile(
            leading: Icon(Icons.cloud_upload_outlined),
            title: Text('대기중인 항목'),
            trailing: Text('0건'), // TODO: SyncQueueEntries where status = PENDING count
          ),
          ListTile(
            leading: Icon(Icons.error_outline, color: Colors.orange),
            title: Text('재시도 실패'),
            trailing: Text('0건'), // TODO: status = FAILED count
          ),
          ListTile(
            leading: Icon(Icons.check_circle_outline, color: Colors.green),
            title: Text('마지막 동기화'),
            trailing: Text('-'), // TODO: 마지막 성공 flush 시각
          ),
        ],
      ),
    );
  }
}
