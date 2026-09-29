# WorkReport AI — 코드 베이스라인

설계서(3차 개정판) 9장 디렉터리 구조를 기준으로 만든 모노레포 baseline입니다.
"MVP 로드맵 2주차(ERD/API/프로젝트 초기 구조/Docker/개발환경)" 범위에 해당합니다.

## 구조

```
workreport-ai/
├── apps/
│   ├── api/      # NestJS + Prisma — 인증/현장/설비/작업/템플릿/보고서/동기화/AI 구조화
│   ├── web/      # Next.js — 관리자 웹 (대시보드/현장/설비/작업/템플릿/보고서)
│   └── mobile/   # Flutter — 현장 작업자 앱 (오프라인 저장/동기화, 코드만 작성, 미검증)
├── packages/
│   └── shared-types/  # API ↔ Web 공유 TypeScript 타입
└── docker-compose.yml # Postgres + Redis + MinIO(S3 호환)
```

## 실행 방법

### 1. 인프라 기동
```bash
docker compose up -d
cp .env.example apps/api/.env   # 필요시 값 수정
```

### 2. API
```bash
npm install
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run db:migrate      # 최초 마이그레이션 생성/적용
npm run db:seed         # 샘플 회사/현장/설비/템플릿 생성
npm run dev:api         # http://localhost:4000/api
```
시드 계정: `admin@example.com` / `password123`

### 3. Web
```bash
npm run dev:web         # http://localhost:3000
```

### 4. Mobile (Flutter — 로컬에 Flutter SDK 설치 필요)
```bash
cd apps/mobile
flutter pub get
flutter run
```

## 이번 baseline에서 검증한 것 / 못한 것

이 코드는 네트워크가 화이트리스트 방식으로 제한된 샌드박스에서 작성되었습니다.
아래 항목은 **실제로 설치·빌드까지 돌려서 확인**했습니다.

- `apps/api`: `npm install` 성공, `tsc --noEmit` 타입체크 통과
  (단, `@prisma/client`를 아직 생성하지 못해 enum 관련 타입 에러 2개가 남아있음 — 아래 참고)
- `apps/web`: `npm install` 성공, `next build` 프로덕션 빌드까지 성공

아래는 **코드는 작성했지만 이 환경에서 실행 검증하지 못한** 부분입니다. 로컬 환경에서 처음 실행할 때 참고하세요.

| 항목 | 이유 | 해야 할 일 |
|---|---|---|
| `npx prisma generate` | Prisma 엔진 바이너리를 `binaries.prisma.sh`에서 받아와야 하는데 샌드박스 네트워크 정책상 차단됨 | 로컬에서 `npx prisma generate` 한 번 실행 — 이후 `apps/api`의 남은 타입 에러(WorkOrderStatus, AttachmentType) 자동 해결 |
| PDF 렌더링 (`PdfService`) | Playwright의 Chromium 바이너리 다운로드가 같은 이유로 차단됨 | 로컬에서 `npx playwright install chromium` 실행 |
| `apps/mobile` 전체 | 이 컨테이너에 Flutter SDK 자체가 없음 | 로컬에서 `flutter pub get` → `flutter analyze`로 문법/의존성 확인 |

## 설계서 대비 baseline의 범위

- **실제 CRUD가 붙어 있는 것**: 회사/사용자/현장/설비/작업(work-orders)/템플릿/보고서(승인·PDF 생성 트리거) — 멀티테넌시(companyId는 JWT에서만 파생)와 역할 기반 권한(ADMIN/MANAGER/WORKER) 적용됨
- **인터페이스만 있고 로직은 이후 채워야 하는 것**:
  - `SyncService` — 이벤트를 멱등하게 기록하는 것까지만 구현. 실제로 각 도메인 서비스에 적용(upsert)하고 충돌 정책을 거는 로직은 TODO
  - `AiService` — `OPENAI_API_KEY` 있으면 실제 OpenAI 호출, 없으면 폴백 응답. 설비 이력 Context 조합 로직은 프롬프트 수준까지만 작성
  - `apps/mobile`의 화면들 — UI 골격 + TODO 주석. 카메라/음성 녹음/로컬 DB insert는 실제 연결 전
- **아직 손대지 않은 것** (설계서 12.3 향후 확장 / 2단계 기능): 기존 PDF 자동 템플릿화, 외부 전송 연동, 통계/대시보드 고도화

## 다음에 이어서 할 일 (설계서 11장 로드맵 3~5주차 기준)

1. `prisma migrate dev`로 실제 마이그레이션 생성 + Postgres에 반영
2. 인증 플로우 실기기/브라우저에서 end-to-end 확인
3. Flutter 쪽 Drift `build_runner` 코드 생성 (`dart run build_runner build`) 후 오프라인 저장 → Sync Queue 흐름 실제 연결
4. `SyncService`에 도메인별 upsert 로직 연결 (work_order/work_record/attachment)
