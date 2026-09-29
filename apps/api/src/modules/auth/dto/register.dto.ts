import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export enum RegisterRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  WORKER = 'WORKER',
}

// 최초 회사 생성 시 관리자 계정을 함께 만든다 (SMB 온보딩 1단계 — 설계서 4.2).
export class RegisterDto {
  @IsString()
  companyName: string;

  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(RegisterRole)
  role: RegisterRole;
}
