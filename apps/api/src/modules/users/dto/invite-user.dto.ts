import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { RegisterRole } from '../../auth/dto/register.dto';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsEnum(RegisterRole)
  role: RegisterRole;

  @IsString()
  @MinLength(8)
  temporaryPassword: string;
}
