import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// QR 스캔으로 설비 자동 식별 (설계서 12.3 향후 확장).
/// 스캔된 코드로 GET /api/equipment/by-qr/:qrCode 를 호출해 설비를 찾는다.
class QrScanScreen extends StatelessWidget {
  const QrScanScreen({super.key, required this.onDetected});

  final void Function(String qrCode) onDetected;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('설비 QR 스캔')),
      body: MobileScanner(
        onDetect: (capture) {
          final barcodes = capture.barcodes;
          if (barcodes.isEmpty) return;
          final value = barcodes.first.rawValue;
          if (value != null) onDetected(value);
        },
      ),
    );
  }
}
