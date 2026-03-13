import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/message.dto';

interface RequestWithUser extends Request {
  user: any;
}

@Controller('messages')
@UseGuards(AuthGuard('jwt'))
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get('conversations')
  async getConversations(@Request() req: RequestWithUser) {
    return this.messagesService.getConversations(req.user.sub);
  }

  @Get('conversation')
  async getOrCreateConversation(
    @Request() req: RequestWithUser,
    @Query('participantId') participantId: string,
  ) {
    return this.messagesService.getOrCreateConversation(req.user.sub, participantId);
  }

  @Get()
  async getMessages(
    @Query('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const messages = await this.messagesService.getMessages(
      conversationId,
      limit ? parseInt(limit) : 50,
      before
    );
    return messages.reverse(); // Return in chronological order
  }

  @Post()
  async sendMessage(@Request() req: RequestWithUser, @Body() dto: SendMessageDto) {
    const conversation = await this.messagesService.getOrCreateConversation(
      req.user.sub,
      dto.recipientId,
    );
    
    const message = await this.messagesService.sendMessage(
      req.user.sub,
      conversation.id,
      dto.content,
    );
    
    return message;
  }

  @Post('read')
  async markAsRead(@Body() body: { messageId: string }) {
    return this.messagesService.markAsRead(body.messageId);
  }
}
