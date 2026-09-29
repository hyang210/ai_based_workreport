import 'package:flutter/material.dart';

/// 최소 입력으로 현장 기록을 저장하는 화면 (설계서 4.1, 16장 "누락 방지형 기록").
/// 이 화면은 네트워크 연결 여부와 무관하게 항상 동작해야 한다 —
/// 저장은 로컬 Drift DB(LocalWorkRecords, LocalAttachments)에 먼저 기록되고,
/// SyncManager.enqueue()를 통해 Sync Queue에 쌓인 뒤 연결 복구 시 서버로 전송된다.
class CaptureScreen extends StatefulWidget {
  const CaptureScreen({super.key, required this.workOrderId});

  final String workOrderId;

  @override
  State<CaptureScreen> createState() => _CaptureScreenState();
}

class _CaptureScreenState extends State<CaptureScreen> {
  final _descriptionController = TextEditingController();
  final Map<String, bool> _checklist = {
    '안전 장비 착용': false,
    '작업 전 사진 촬영': false,
    '작업 후 사진 촬영': false,
    '특이사항 기록': false,
  };
  final List<String> _capturedPhotoPaths = [];

  Future<void> _saveLocally() async {
    // TODO: LocalWorkRecords / LocalAttachments에 insert
    // TODO: SyncManager.enqueue(entityType: 'work_record', operation: 'CREATE', payload: {...})
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('로컬에 저장되었습니다. 연결 복구 시 자동 동기화됩니다.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('작업 기록 · ${widget.workOrderId}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('체크리스트', style: TextStyle(fontWeight: FontWeight.bold)),
          ..._checklist.keys.map(
            (key) => CheckboxListTile(
              title: Text(key),
              value: _checklist[key],
              onChanged: (v) => setState(() => _checklist[key] = v ?? false),
            ),
          ),
          const Divider(height: 32),
          const Text('사진', style: TextStyle(fontWeight: FontWeight.bold)),
          Wrap(
            spacing: 8,
            children: [
              ..._capturedPhotoPaths.map((path) => const Chip(label: Text('사진'))),
              ActionChip(
                avatar: const Icon(Icons.camera_alt, size: 18),
                label: const Text('사진 추가'),
                onPressed: () {
                  // TODO: camera / image_picker 패키지 연결
                  setState(() => _capturedPhotoPaths.add('local/path/placeholder.jpg'));
                },
              ),
            ],
          ),
          const Divider(height: 32),
          const Text('작업 내용 (텍스트/음성)', style: TextStyle(fontWeight: FontWeight.bold)),
          TextField(
            controller: _descriptionController,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: '예: 3층 냉방기에서 소음이 발생해 분해 점검했고 팬 모터 고정 나사가 풀려 있어 조인 후 시험 운전했습니다.',
              border: OutlineInputBorder(),
            ),
          ),
          TextButton.icon(
            onPressed: () {
              // TODO: record 패키지로 음성 녹음 → 서버 업로드 후 STT/LLM 처리 (설계서 5.1)
            },
            icon: const Icon(Icons.mic),
            label: const Text('음성으로 입력'),
          ),
          const SizedBox(height: 24),
          ElevatedButton(onPressed: _saveLocally, child: const Text('작업 완료')),
        ],
      ),
    );
  }
}
