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

- `apps/api`: `npm install` 성공, `tsc --noEmit` 통과
  (단, `@prisma/client`를 생성하지 못해 enum 관련 타입 에러 2개가 남아있음 — 아래 참고)
- `apps/api` 단위 테스트: `npm test --workspace=apps/api` → 4개 스위트 / 25개 테스트 통과
  (동기화 정책, 누락 판정, 승인 게이트, AI 정리. DB 없이 가짜 Prisma로 실행. 정책 코드를 일부러 깨뜨리면 테스트가 실패하는 것까지 확인)
- `apps/web`: `npm install` 성공, `next build` 프로덕션 빌드까지 성공

아래는 **코드는 작성했지만 이 환경에서 실행 검증하지 못한** 부분입니다. 로컬 환경에서 처음 실행할 때 참고하세요.

| 항목 | 이유 | 해야 할 일 |
|---|---|---|
| `npx prisma generate` | Prisma 엔진 바이너리를 `binaries.prisma.sh`에서 받아와야 하는데 샌드박스 네트워크 정책상 차단됨 | 로컬에서 `npx prisma generate` 한 번 실행 — 이후 `apps/api`의 남은 타입 에러(WorkOrderStatus, AttachmentType) 자동 해결 |
| PDF 렌더링 (`PdfService`) | Playwright의 Chromium 바이너리 다운로드가 같은 이유로 차단됨 | 로컬에서 `npx playwright install chromium` 실행 |
| `apps/mobile` 전체 | 이 컨테이너에 Flutter SDK 자체가 없음 | 로컬에서 `flutter pub get` → `flutter analyze`로 문법/의존성 확인 |

## 핵심 흐름 (v0.2)

```
[모바일, 오프라인] 작업 생성 / 기록 / 사진  ──(Sync Queue)──▶  POST /api/sync/events
                                                                 │ 엔티티별 정책 적용, clientUuid로 멱등
[웹] POST /api/reports                                           ▼
     POST /api/reports/:id/ai-draft      ← 작업 기록 + 설비 최근 이력(Context) → AI 구조화 → 초안(content)
     PATCH /api/reports/:id/content      ← 관리자가 초안 수정
     GET  /api/reports/:id/missing-fields← 템플릿 required 필드·필수 사진 대조
     POST /api/reports/:id/approve       ← 누락이 있으면 거부 / 승인되면 설비 이력에 기록
     POST /api/reports/:id/generate      ← 승인된 내용으로만 PDF 생성
```

**동기화 정책** (`sync.service.ts` 상단 주석에 이벤트 계약 정리): entityId는 기기가 발급한 clientUuid.
work_order는 서버가 이미 COMPLETED/CANCELLED면 서버값 우선, work_record·attachment는 append-only(수정·삭제 거부).
검증/정책 거부는 `FAILED`(+사유)로 기록하고, DB 장애 같은 예기치 못한 오류는 기록하지 않고 던져서 기기가 재전송하게 한다.

**AI 초안**: 근거 없는 항목은 `null`로 남기게 하고, 그 항목은 누락 검증이 잡는다.
`OPENAI_API_KEY`가 없으면 원문을 `description`에 넣는 fallback으로 동작한다(나머지는 관리자가 채움).

## 설계서 대비 baseline의 범위

- **실제로 동작하는 것**: 회사/사용자/현장/설비/작업/템플릿 CRUD(멀티테넌시·역할 권한), 오프라인 이벤트 적용, AI 초안, 설비 이력 Context, 템플릿 기반 누락 검증과 승인 게이트, 승인 후 PDF 생성 트리거
- **아직 채워야 하는 것**:
  - `apps/mobile`의 화면들 — UI 골격 + TODO. 카메라/음성 녹음/로컬 DB insert는 실제 연결 전
  - 첨부 `fileUrl`이 우리 스토리지 경로인지 검증하지 않음
  - 보고서 버전 관리(승인 후 수정은 지금은 막기만 함), 감사 로그 확대, 웹의 템플릿 편집·초안 수정 UI
  - PDF에 사진 삽입
- **손대지 않은 것** (설계서 12.3 / 2단계): 기존 PDF 자동 템플릿화, 외부 전송 연동, 통계

## 다음에 이어서 할 일

1. `prisma migrate dev`로 실제 마이그레이션 생성 + Postgres에서 시드·흐름 end-to-end 1회 확인
2. Flutter: `dart run build_runner build` 후 capture 화면의 로컬 저장 → `SyncManager.enqueue()` 연결
3. 웹: 작업 생성 폼, 보고서 초안 수정·누락 표시 화면
4. 보고서 버전 관리, 사진이 들어간 PDF
