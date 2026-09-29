import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructureTextDto } from './dto/structure-text.dto';

// AI의 역할은 "구조화"로 한정한다 (설계서 6.1, 6.2).
// - 날짜·금액·수량·설비번호 같은 원본 값을 임의로 생성하지 않는다.
// - 최종 승인은 하지 않는다 (관리자 검토 필수).
// - equipmentContext가 있으면 "관련 이력/참고 정보"로만 언급하고, 원인으로 단정하지 않는다.
const SYSTEM_PROMPT = `당신은 현장 작업 기록을 구조화하는 어시스턴트입니다.
입력된 원문에 없는 사실(날짜, 금액, 수량, 설비번호 등)을 새로 만들어내지 마세요.
반드시 아래 JSON 스키마로만 응답하세요:
{"work_description": string, "issue": string, "action": string, "result": string}
설비 이력 컨텍스트가 주어지면 "관련 이력" 또는 "참고 정보"로만 표현하고, 원인으로 단정하지 마세요.`;

@Injectable()
export class AiService {
  constructor(private config: ConfigService) {}

  async structure(dto: StructureTextDto) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      // 로컬 개발 baseline: 키가 없으면 최소한의 규칙 기반 fallback을 반환한다.
      // 실제 구조화 품질 검증은 OPENAI_API_KEY 설정 후 확인할 것.
      return {
        work_description: dto.text.slice(0, 60),
        issue: null,
        action: null,
        result: null,
        _note: 'OPENAI_API_KEY 미설정 — 폴백 응답입니다. .env에 키를 설정하세요.',
      };
    }

    const userContent = dto.equipmentContext
      ? `작업 기록: ${dto.text}\n\n설비 이력(참고용): ${dto.equipmentContext}`
      : `작업 기록: ${dto.text}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      throw new ServiceUnavailableException('AI 구조화 요청에 실패했습니다.');
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '{}';
    return JSON.parse(content);
  }
}
