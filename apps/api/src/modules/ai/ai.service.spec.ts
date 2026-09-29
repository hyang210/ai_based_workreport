import { AiService, sanitize } from './ai.service';

describe('sanitize', () => {
  it('스키마 밖의 키는 버리고 빈 값은 null로 정리한다', () => {
    expect(sanitize({ description: ' 점검 ', issue: '', action: 3, result: null, extra: 'x' })).toEqual({
      description: '점검',
      issue: null,
      action: null,
      result: null,
    });
  });

  it('객체가 아닌 응답도 안전하게 처리한다', () => {
    expect(sanitize('oops')).toEqual({ description: null, issue: null, action: null, result: null });
  });
});

describe('AiService fallback (API 키 없음)', () => {
  it('원문을 description에 넣고 나머지는 null로 둔다 -> 누락 검증이 잡게 된다', async () => {
    const service = new AiService({ get: () => undefined } as any);
    const { model, output } = await service.structure({ text: '3층 냉방기 소음 점검' });
    expect(model).toBe('fallback');
    expect(output).toEqual({ description: '3층 냉방기 소음 점검', issue: null, action: null, result: null });
  });
});
