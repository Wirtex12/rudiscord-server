import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendsService } from './friends.service';
import {
  SendFriendRequestDto,
  AcceptFriendRequestDto,
  DeclineFriendRequestDto,
  RemoveFriendDto,
} from './dto/friends.dto';

// Extend Request type to include user property from JWT
interface RequestWithUser extends Request {
  user: any;
}

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /**
   * Получить список друзей с информацией о конверсациях
   */
  @Get('with-conversations')
  async getFriendsWithConversations(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.friendsService.getFriendsWithConversations(userId);
  }

  /**
   * Получить список друзей
   */
  @Get()
  async getFriends(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.friendsService.getFriends(userId);
  }

  /**
   * Получить ожидающие запросы дружбы
   */
  @Get('pending')
  async getPendingRequests(@Req() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.friendsService.getPendingRequests(userId);
  }

  /**
   * Отправить запрос дружбы
   */
  @Post('request')
  @HttpCode(HttpStatus.CREATED)
  async sendFriendRequest(
    @Req() req: RequestWithUser,
    @Body() dto: SendFriendRequestDto,
  ) {
    const senderId = req.user.sub;
    return this.friendsService.sendFriendRequest(senderId, dto.userId);
  }

  /**
   * Принять запрос дружбы
   */
  @Post('accept')
  async acceptFriendRequest(
    @Req() req: RequestWithUser,
    @Body() dto: AcceptFriendRequestDto,
  ) {
    const receiverId = req.user.sub;
    return this.friendsService.acceptFriendRequest(dto.requestId, receiverId);
  }

  /**
   * Отклонить запрос дружбы
   */
  @Post('decline')
  async declineFriendRequest(
    @Req() req: RequestWithUser,
    @Body() dto: DeclineFriendRequestDto,
  ) {
    const receiverId = req.user.sub;
    return this.friendsService.declineFriendRequest(dto.requestId, receiverId);
  }

  /**
   * Отменить запрос дружбы
   */
  @Post('cancel')
  async cancelFriendRequest(
    @Req() req: RequestWithUser,
    @Body() dto: { requestId: string },
  ) {
    const senderId = req.user.sub;
    return this.friendsService.cancelFriendRequest(dto.requestId, senderId);
  }

  /**
   * Удалить друга
   */
  @Post('remove')
  async removeFriend(
    @Req() req: RequestWithUser,
    @Body() dto: RemoveFriendDto,
  ) {
    const userId = req.user.sub;
    return this.friendsService.removeFriend(userId, dto.friendId);
  }
}
