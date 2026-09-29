// 화면에서 쓰는 한글 라벨. 템플릿 필드 키(field_key) -> 표시 이름.
const FIELD_LABEL: Record<string, string> = {
  description: '작업 내용',
  issue: '이슈',
  action: '조치 내용',
  result: '작업 결과',
  before_photos: '작업 전 사진',
  after_photos: '작업 후 사진',
};

export const fieldLabel = (key: string) => FIELD_LABEL[key] ?? key;

export const REPORT_STATUS_LABEL: Record<string, string> = {
  DRAFT: '초안',
  AI_GENERATED: 'AI 초안 생성됨',
  REVIEW: '검토중',
  APPROVED: '승인됨',
  GENERATED: 'PDF 생성완료',
  SENT: '전달완료',
};

export const ATTACHMENT_LABEL: Record<string, string> = {
  PHOTO_BEFORE: '작업 전 사진',
  PHOTO_AFTER: '작업 후 사진',
  PHOTO_GENERAL: '일반 사진',
};
