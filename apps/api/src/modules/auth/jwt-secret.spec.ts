import { ConfigService } from '@nestjs/config';
import { jwtSecret } from './jwt-secret';

const config = (env: Record<string, string>) => ({ get: (k: string) => env[k] }) as unknown as ConfigService;

describe('jwtSecret', () => {
  it('JWT_SECRET이 없으면 서버를 띄우지 않는다', () => {
    expect(() => jwtSecret(config({}))).toThrow(/JWT_SECRET/);
  });

  it('개발 환경에서는 예시 값도 허용한다', () => {
    expect(jwtSecret(config({ JWT_SECRET: 'change-me-in-production' }))).toBe('change-me-in-production');
  });

  it('운영 환경에서는 예시 값과 짧은 키를 거부한다', () => {
    expect(() => jwtSecret(config({ NODE_ENV: 'production', JWT_SECRET: 'change-me-in-production' }))).toThrow();
    expect(() => jwtSecret(config({ NODE_ENV: 'production', JWT_SECRET: 'short' }))).toThrow();
  });

  it('운영 환경에서 충분히 긴 키는 통과한다', () => {
    const secret = 'x'.repeat(32);
    expect(jwtSecret(config({ NODE_ENV: 'production', JWT_SECRET: secret }))).toBe(secret);
  });
});
