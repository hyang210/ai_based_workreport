import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  companyId: string;
  role: 'ADMIN' | 'MANAGER' | 'WORKER';
  email: string;
}

// JwtStrategy.validate()가 반환한 값이 req.user에 실려온다.
// 회사 ID는 항상 이 값에서 파생시키고, 클라이언트가 보낸 companyId를 신뢰하지 않는다 (설계서 8장 API 원칙).
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return data ? user?.[data] : user;
  },
);
