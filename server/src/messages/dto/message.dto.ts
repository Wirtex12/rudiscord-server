import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;
  
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}

export class GetMessagesDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;
  
  @IsString()
  @IsOptional()
  before?: string;
  
  @IsString()
  @IsOptional()
  limit?: string;
}
