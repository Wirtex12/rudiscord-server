import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Найти пользователя по Friend Code (6-значный код) или username
   */
  async findUserByIdentifier(identifier: string) {
    const isShortId = /^\d{6}$/.test(identifier);

    let user;
    if (isShortId) {
      user = await this.prisma.user.findUnique({
        where: { shortId: identifier },
        select: {
          id: true,
          userId: true,
          shortId: true,
          username: true,
          email: true,
          avatar: true,
        },
      });
    }

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { username: identifier },
        select: {
          id: true,
          userId: true,
          shortId: true,
          username: true,
          email: true,
          avatar: true,
        },
      });
    }

    if (!user) {
      throw new NotFoundException('User not found. Please check the Friend Code or username.');
    }

    return user;
  }

  /**
   * Отправить запрос в друзья
   */
  async sendRequest(senderId: string, identifier: string) {
    const recipient = await this.findUserByIdentifier(identifier);

    if (recipient.id === senderId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const existingRequest = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: recipient.id },
          { senderId: recipient.id, receiverId: senderId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new ConflictException('Friend request already exists');
      }
      if (existingRequest.status === 'accepted') {
        throw new ConflictException('You are already friends');
      }
      if (existingRequest.status === 'blocked') {
        throw new BadRequestException('Cannot send request (blocked)');
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        senderId,
        receiverId: recipient.id,
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            shortId: true,
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userId: true,
            shortId: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return friendship;
  }

  /**
   * Получить список друзей пользователя
   */
  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            shortId: true,
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userId: true,
            shortId: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return friendships.map((friendship) => {
      const friend = friendship.senderId === userId ? friendship.receiver : friendship.sender;
      return {
        friendshipId: friendship.id,
        ...friend,
      };
    });
  }

  /**
   * Получить входящие запросы в друзья
   */
  async getIncomingRequests(userId: string) {
    const requests = await this.prisma.friendship.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            shortId: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return requests.map((request) => ({
      friendshipId: request.id,
      ...request.sender,
    }));
  }

  /**
   * Принять запрос в друзья
   */
  async acceptRequest(userId: string, friendshipId: string) {
    const friendship = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            shortId: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    return friendship;
  }

  /**
   * Отклонить запрос в друзья
   */
  async rejectRequest(userId: string, friendshipId: string) {
    return this.prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  /**
   * Удалить друга
   */
  async removeFriend(userId: string, friendId: string) {
    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
    });

    return { success: true };
  }

  /**
   * Заблокировать пользователя
   */
  async blockUser(userId: string, friendId: string) {
    await this.prisma.friendship.updateMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
      data: { status: 'blocked' },
    });

    return { success: true };
  }
}
