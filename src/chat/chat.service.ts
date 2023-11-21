import { ForbiddenException, Injectable } from '@nestjs/common';
import { Conversation, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prismaService: PrismaService) {}

  async findConversation(user: User, recipient: User) {
    let conversation = await this.prismaService.conversation.findFirst({
      where: {
        AND: [
          {
            participant: {
              some: {
                userId: user.id,
              },
            },
          },
          {
            participant: {
              some: {
                userId: recipient.id,
              },
            },
          },
        ],
      },
    });
    if (!conversation) {
      conversation = await this.prismaService.conversation.create({
        data: {
          participant: {
            createMany: {
              data: [
                {
                  userId: user.id,
                },
                {
                  userId: recipient.id,
                },
              ],
            },
          },
        },
        include: {
          participant: true,
        },
      });
    }
    return conversation;
  }

  async findRecipient(user: User, userId: string) {
    const recipient = await this.prismaService.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });
    if (user.id === recipient.id)
      throw new ForbiddenException("You can't text yourself");

    return recipient;
  }

  async readMessages(
    conversation: Conversation,
    recipient: User,
  ): Promise<void> {
    await this.prismaService.message.updateMany({
      where: {
        conversationId: conversation.id,
        senderId: recipient.id,
      },
      data: {
        read: true,
      },
    });
  }

  async enterConversation(user: User, userId: string) {
    const recipient: User = await this.findRecipient(user, userId);
    const conversation: Conversation = await this.findConversation(
      user,
      recipient,
    );

    await this.readMessages(conversation, recipient);

    const messages = await this.prismaService.message.findMany({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return messages;
  }

  async getListContact(user: User) {
    const participants = await this.prismaService.participant.findMany({
      where: {
        userId: user.id,
      },
      select: {
        conversation: {
          select: {
            participant: {
              where: {
                user: {
                  id: {
                    not: user.id,
                  },
                  accessFailedCount: 0,
                },
              },
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    ava: true,
                  },
                },
              },
            },
            message: {
              select: {
                message: true,
                senderId: true,
                read: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });
    const list: any[] = [];
    for await (const participant of participants) {
      const toUser = participant.conversation.participant[0]?.user || undefined;
      if (toUser)
        list.push({
          user: toUser,
          message: participant.conversation.message[0],
        });
    }
    list.sort(this.compare);
    const users = await this.prismaService.user.findMany({
      where: {
        participant: {
          every: {
            conversation: {
              participant: {
                none: {
                  userId: user.id,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        ava: true,
      },
    });
    for (const contact of users) {
      list.push({
        user: contact,
        message: null,
      });
    }
    return list;
  }

  compare(a: any, b: any) {
    if (!a.message || !b.message) return 0;
    if (Date.parse(a.message.createdAt) > Date.parse(b.message.createdAt)) {
      return -1;
    }
    if (Date.parse(a.message.createdAt) < Date.parse(b.message.createdAt)) {
      return 1;
    }
    return 0;
  }
}
