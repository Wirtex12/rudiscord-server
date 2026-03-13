import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

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
            username: true,
            email: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userId: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return friendships.map((friendship) => {
      const friend =
        friendship.senderId === userId
          ? friendship.receiver
          : friendship.sender;

      return {
        id: friend.id,
        userId: friend.userId,
        username: friend.username,
        email: friend.email,
        avatar: friend.avatar,
        friendshipId: friendship.id,
      };
    });
  }

  /**
   * Получить список друзей с информацией о конверсациях
   */
  async getFriendsWithConversations(userId: string) {
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
            username: true,
            avatar: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userId: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    const friendsWithConversations = await Promise.all(
      friendships.map(async (friendship) => {
        const friend =
          friendship.senderId === userId
            ? friendship.receiver
            : friendship.sender;

        // Найти конверсацию между пользователями
        const conversation = await this.prisma.conversation.findFirst({
          where: {
            participants: {
              every: {
                id: {
                  in: [userId, friend.id],
                },
              },
            },
          },
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  },
                },
              },
            },
          },
        });

        const lastMessage = conversation?.messages[0];

        return {
          id: friend.id,
          userId: friend.userId,
          username: friend.username,
          avatar: friend.avatar,
          conversationId: conversation?.id,
          lastMessage: lastMessage?.content,
          lastMessageAt: lastMessage?.createdAt,
        };
      }),
    );

    return friendsWithConversations;
  }

  /**
   * Получить ожидающие запросы дружбы
   */
  async getPendingRequests(userId: string) {
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
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return requests.map((request) => ({
      id: request.id,
      senderId: request.senderId,
      sender: request.sender,
      createdAt: request.createdAt,
      status: request.status,
    }));
  }

  /**
   * Отправить запрос дружбы
   */
  async sendFriendRequest(senderId: string, receiverId: string) {
    // Проверить, не являются ли пользователи уже друзьями
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            senderId: senderId,
            receiverId: receiverId,
          },
          {
            senderId: receiverId,
            receiverId: senderId,
          },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        throw new ConflictException('Пользователи уже являются друзьями');
      }
      if (existingFriendship.status === 'pending') {
        throw new ConflictException('Запрос дружбы уже отправлен');
      }
    }

    const friendship = await this.prisma.friendship.create({
      data: {
        senderId: senderId,
        receiverId: receiverId,
        status: 'pending',
      },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            username: true,
          },
        },
      },
    });

    return {
      message: 'Запрос дружбы отправлен',
      request: {
        id: friendship.id,
        senderId: friendship.senderId,
        senderUsername: friendship.sender.username,
        createdAt: friendship.createdAt,
        status: friendship.status,
      },
    };
  }

  /**
   * Принять запрос дружбы
   */
  async acceptFriendRequest(requestId: string, receiverId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        id: requestId,
        receiverId: receiverId,
        status: 'pending',
      },
    });

    if (!friendship) {
      throw new NotFoundException('Запрос дружбы не найден');
    }

    const updatedFriendship = await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'accepted' },
      include: {
        sender: {
          select: {
            id: true,
            userId: true,
            username: true,
          },
        },
        receiver: {
          select: {
            id: true,
            userId: true,
            username: true,
          },
        },
      },
    });

    // Создать конверсацию для друзей
    await this.prisma.conversation.create({
      data: {
        participants: {
          connect: [
            { id: friendship.senderId },
            { id: friendship.receiverId },
          ],
        },
      },
    });

    return {
      message: 'Запрос дружбы принят',
      friendship: {
        id: updatedFriendship.id,
        senderId: updatedFriendship.senderId,
        senderUsername: updatedFriendship.sender.username,
        receiverId: updatedFriendship.receiverId,
        receiverUsername: updatedFriendship.receiver.username,
        status: updatedFriendship.status,
      },
    };
  }

  /**
   * Отклонить запрос дружбы
   */
  async declineFriendRequest(requestId: string, receiverId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        id: requestId,
        receiverId: receiverId,
        status: 'pending',
      },
    });

    if (!friendship) {
      throw new NotFoundException('Запрос дружбы не найден');
    }

    await this.prisma.friendship.update({
      where: { id: requestId },
      data: { status: 'declined' },
    });

    return { message: 'Запрос дружбы отклонен' };
  }

  /**
   * Удалить друга
   */
  async removeFriend(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          {
            senderId: userId,
            receiverId: friendId,
          },
          {
            senderId: friendId,
            receiverId: userId,
          },
        ],
        status: 'accepted',
      },
    });

    if (!friendship) {
      throw new NotFoundException('Дружба не найдена');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return { message: 'Друг удален' };
  }

  /**
   * Отменить запрос дружбы
   */
  async cancelFriendRequest(requestId: string, senderId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        id: requestId,
        senderId: senderId,
        status: 'pending',
      },
    });

    if (!friendship) {
      throw new NotFoundException('Запрос дружбы не найден');
    }

    await this.prisma.friendship.delete({
      where: { id: requestId },
    });

    return { message: 'Запрос дружбы отменен' };
  }
}
