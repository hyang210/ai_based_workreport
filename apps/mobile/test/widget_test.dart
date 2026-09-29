import 'package:flutter_test/flutter_test.dart';
import 'package:workreport_mobile/main.dart';

void main() {
  testWidgets('App boots without crashing', (tester) async {
    await tester.pumpWidget(const ProviderScopeWrapperForTest());
    expect(find.byType(WorkReportApp), findsOneWidget);
  });
}

/// TODO: 실제 테스트 환경에서는 flutter_riverpod의 ProviderScope로 감싼 형태로 교체.
/// 이 파일은 Flutter SDK가 없는 이 baseline 환경에서 실행 검증되지 않았습니다.
class ProviderScopeWrapperForTest extends WorkReportApp {
  const ProviderScopeWrapperForTest({super.key});
}
