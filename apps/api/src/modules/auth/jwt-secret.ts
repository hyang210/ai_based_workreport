import { ConfigService } from '@nestjs/config';

const PLACEHOLDER = 'change-me-in-production';
const MIN_PRODUCTION_LENGTH = 32;

// JWT 서명 키. 없으면 서버를 띄우지 않는다 — 기본값으로 조용히 넘어가면 누구나 토큰을 위조할 수 있다.
// 운영(NODE_ENV=production)에서는 .env.example의 예시 값이나 짧은 키도 거부한다.
export function jwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  if (config.get<string>('NODE_ENV') === 'production' && (secret === PLACEHOLDER || secret.length < MIN_PRODUCTION_LENGTH)) {
    throw new Error(`운영 환경의 JWT_SECRET은 예시 값이 아닌 ${MIN_PRODUCTION_LENGTH}자 이상의 임의 문자열이어야 합니다.`);
  }
  return secret;
}
