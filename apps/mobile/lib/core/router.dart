import 'package:go_router/go_router.dart';
import '../features/auth/login_screen.dart';
import '../features/tasks/today_tasks_screen.dart';
import '../features/capture/capture_screen.dart';
import '../features/sync/sync_status_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/tasks', builder: (context, state) => const TodayTasksScreen()),
    GoRoute(
      path: '/tasks/:workOrderId/capture',
      builder: (context, state) => CaptureScreen(workOrderId: state.pathParameters['workOrderId']!),
    ),
    GoRoute(path: '/sync-status', builder: (context, state) => const SyncStatusScreen()),
  ],
);
