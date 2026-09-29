import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// 작업자 화면 흐름 (설계서 4.1):
/// [오늘의 작업] → 작업 시작 → 체크리스트 → 사진 추가 → 음성/텍스트 입력 → 작업 완료
///
/// baseline: 로컬 DB(LocalWorkOrders)를 조회해 오늘 배정된 작업을 보여준다.
/// 실제 목록 로딩/필터링 로직은 아직 연결 전 — TODO 표시.
class TodayTasksScreen extends StatelessWidget {
  const TodayTasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('오늘의 작업')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _TaskCard(
            siteName: '샘플 빌딩',
            equipmentType: '냉방기',
            status: '대기',
            onTap: () => context.push('/tasks/sample-work-order/capture'),
          ),
          const SizedBox(height: 8),
          const Text(
            'TODO: LocalWorkOrders 테이블에서 오늘 배정된 작업을 조회하도록 연결\n'
            'TODO: 인터넷 끊김 상태에서도 이 화면이 그대로 동작해야 함 (오프라인 우선순위 1)',
            style: TextStyle(color: Colors.grey, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.siteName, required this.equipmentType, required this.status, required this.onTap});

  final String siteName;
  final String equipmentType;
  final String status;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(siteName),
        subtitle: Text(equipmentType),
        trailing: Chip(label: Text(status)),
        onTap: onTap,
      ),
    );
  }
}
