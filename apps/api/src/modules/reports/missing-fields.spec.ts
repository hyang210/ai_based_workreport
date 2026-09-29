import { findMissing, RequiredField } from './missing-fields';

const fields: RequiredField[] = [
  { fieldKey: 'issue', fieldType: 'text', required: true },
  { fieldKey: 'result', fieldType: 'text', required: true },
  { fieldKey: 'note', fieldType: 'text', required: false },
  { fieldKey: 'before_photos', fieldType: 'photo', required: false },
  { fieldKey: 'after_photos', fieldType: 'photo', required: true },
];

describe('findMissing', () => {
  it('빈 값·공백·null인 필수 텍스트 필드와 사진 없는 필수 사진 필드를 모두 잡는다', () => {
    expect(findMissing(fields, { issue: '  ', result: null }, [])).toEqual(['issue', 'result', 'after_photos']);
  });

  it('content가 아직 없으면(AI 초안 전) 필수 필드가 전부 누락이다', () => {
    expect(findMissing(fields, null, ['PHOTO_AFTER'])).toEqual(['issue', 'result']);
  });

  it('필수가 아닌 필드는 비어 있어도 무시한다', () => {
    expect(findMissing(fields, { issue: 'a', result: 'b', note: '' }, ['PHOTO_AFTER'])).toEqual([]);
  });

  it('사진은 필드에 대응하는 첨부 타입으로 판정한다 (작업 전 사진으로 작업 후 사진을 대신할 수 없다)', () => {
    expect(findMissing(fields, { issue: 'a', result: 'b' }, ['PHOTO_BEFORE'])).toEqual(['after_photos']);
  });
});
