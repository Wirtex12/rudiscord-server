import { IsEmail, MaxLength, IsString, MinLength } from 'class-validator';

export class VerifyCodeDto {
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}
