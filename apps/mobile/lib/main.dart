import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router.dart';

void main() {
  runApp(const ProviderScope(child: WorkReportApp()));
}

class WorkReportApp extends StatelessWidget {
  const WorkReportApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'WorkReport AI',
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF1F4E79),
        useMaterial3: true,
      ),
      routerConfig: appRouter,
    );
  }
}
