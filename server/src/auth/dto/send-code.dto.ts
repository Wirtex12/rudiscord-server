import { IsEmail, MaxLength } from 'class-validator';

export class SendCodeDto {
  @IsEmail()
  @MaxLength(100)
  email: string;
}
