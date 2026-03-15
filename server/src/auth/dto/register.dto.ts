import { IsString, MinLength, MaxLength, IsEmail, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsOptional()
  @IsString()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female';
}
