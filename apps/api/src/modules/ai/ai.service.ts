import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructureTextDto } from './dto/structure-text.dto';

// AI의 역할은 "구조화"로 한정한다 (설계서 6.1, 6.2).
// - 날짜·금액·수량·설비번호 같은 원본 값을 임의로 생성하지 않는다.
// - 원문에 근거가 없는 항목은 null로 남긴다 -> 누락 검증이 그 항목을 잡아낸다 (설계서 16장).
// - equipmentContext는 "관련 이력/참고 정보"로만 쓰고 원인으로 단정하지 않는다 (설계서 6.5).
// - 최종 승인은 하지 않는다 (관리자 검토 필수).
const SYSTEM_PROMPT = `당신은 현장 작업 기록을 구조화하는 어시스턴트입니다.
입력된 원문에 없는 사실(날짜, 금액, 수량, 설비번호 등)을 새로 만들어내지 마세요.
원문에서 근거를 찾을 수 없는 항목은 반드시 null로 두세요.
반드시 아래 JSON 스키마로만 응답하세요:
{"description": string|null, "issue": string|null, "action": string|null, "result": string|null}
설비 이력이 주어지면 "관련 이력" 또는 "참고 정보"로만 언급하고, 원인으로 단정하지 마세요.`;

// 키는 템플릿 필드 키(template_fields.field_key)와 동일하다.
export type StructuredFields = {
  description: string | null;
  issue: string | null;
  action: string | null;
  result: string | null;
};
const FIELD_KEYS = ['description', 'issue', 'action', 'result'] as const;

@Injectable()
export class AiService {
  constructor(private config: ConfigService) {}

  async structure(dto: StructureTextDto): Promise<{ model: string; output: StructuredFields }> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      // 로컬 개발 fallback: 원문 전체를 description에 넣고 나머지는 비워 둔다.
      // 나머지 항목은 누락 검증에 걸리므로 관리자가 직접 채우게 된다.
      return {
        model: 'fallback',
        output: sanitize({ description: dto.text.trim().slice(0, 500) }),
      };
    }

    const model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
    const userContent = dto.equipmentContext
      ? `작업 기록: ${dto.text}\n\n설비 이력(참고용):\n${dto.equipmentContext}`
      : `작업 기록: ${dto.text}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new ServiceUnavailableException('AI 구조화 요청에 실패했습니다.');

    const data = await res.json();
    try {
      return { model, output: sanitize(JSON.parse(data.choices?.[0]?.message?.content ?? '{}')) };
    } catch {
      throw new ServiceUnavailableException('AI 응답을 해석하지 못했습니다.');
    }
  }
}

/** 스키마 밖의 키는 버리고, 문자열이 아니거나 빈 값은 null로 정리한다. */
export function sanitize(raw: unknown): StructuredFields {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = {} as StructuredFields;
  for (const key of FIELD_KEYS) {
    const value = source[key];
    out[key] = typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  }
  return out;
}
