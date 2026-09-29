// 누락 판정은 LLM의 추측이 아니라 템플릿의 required 규칙과 증빙 연결 상태로 한다 (설계서 16장).

/** 사진 필드 키 -> 첨부 타입. 목록에 없는 사진 필드는 사진 첨부가 하나라도 있으면 충족으로 본다. */
const PHOTO_FIELD_ATTACHMENT: Record<string, string> = {
  before_photos: 'PHOTO_BEFORE',
  after_photos: 'PHOTO_AFTER',
  photos: 'PHOTO_GENERAL',
};

export type RequiredField = { fieldKey: string; fieldType: string; required: boolean };

/** 필수인데 채워지지 않은 필드 키 목록을 돌려준다. */
export function findMissing(
  fields: RequiredField[],
  content: Record<string, unknown> | null,
  attachmentTypes: string[],
): string[] {
  return fields
    .filter((f) => f.required)
    .filter((f) => (f.fieldType === 'photo' ? !hasPhoto(f.fieldKey, attachmentTypes) : isBlank(content?.[f.fieldKey])))
    .map((f) => f.fieldKey);
}

function hasPhoto(fieldKey: string, attachmentTypes: string[]): boolean {
  const type = PHOTO_FIELD_ATTACHMENT[fieldKey];
  return type ? attachmentTypes.includes(type) : attachmentTypes.some((t) => t.startsWith('PHOTO'));
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}
