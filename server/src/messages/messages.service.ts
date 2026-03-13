import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateConversation(userId1: string, userId2: string) {
    // Try to find existing conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        participants: {
          every: {
            id: { in: [userId1, userId2] }
          }
        }
      },
      include: {
        participants: {
          select: { id: true, userId: true, username: true, avatar: true }
        }
      }
    });

    // Create if doesn't exist
    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: userId1 }, { id: userId2 }]
          }
        },
        include: {
          participants: {
            select: { id: true, userId: true, username: true, avatar: true }
          }
        }
      });
    }

    return conversation;
  }

  async sendMessage(senderId: string, conversationId: string, content: string) {
    return this.prisma.message.create({
      data: {
        senderId,
        conversationId,
        content,
      },
      include: {
        sender: {
          select: { id: true, userId: true, username: true, avatar: true }
        }
      }
    });
  }

  async getMessages(conversationId: string, limit: number = 50, before?: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, userId: true, username: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(before && { skip: 1, cursor: { id: before } })
    });
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { id: userId }
        }
      },
      include: {
        participants: {
          select: { id: true, userId: true, username: true, avatar: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, username: true, avatar: true }
            }
          }
        }
      }
    });

    // Transform to include other participant and unread count
    return conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => p.id !== userId);
      return {
        id: conv.id,
        participant: otherParticipant,
        lastMessage: conv.messages[0] || null,
        createdAt: conv.createdAt,
      };
    });
  }

  async markAsRead(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() }
    });
  }
}
