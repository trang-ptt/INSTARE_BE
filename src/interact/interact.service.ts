import { ForbiddenException, Injectable } from '@nestjs/common';
import { Reaction, User } from '@prisma/client';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ChatService } from 'src/chat/chat.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommentDto } from './dto/cmt.dto';
import { ShareDto } from './dto/share.dto';

@Injectable()
export class InteractService {
  constructor(
    private prismaService: PrismaService,
    private chatGateway: ChatGateway,
    private chatService: ChatService,
  ) {}

  getReaction(react: string) {
    switch(react) {
      case 'LOVE':
        return Reaction.LOVE
      case 'LIKE':
        return Reaction.LIKE
      case 'LAUGH':
        return Reaction.LAUGH
      case 'SAD':
        return Reaction.SAD
      case 'ANGRY':
        return Reaction.ANGRY
      default:
        return Reaction.LOVE
    }
  }

  async likePost(user: User, id: string, react: string) {
    const liked = await this.prismaService.like.findFirst({
      where: {
        postId: id,
        userId: user.id,
      },
    });

    let like;
    if (liked) {
      like = await this.prismaService.like.update({
        where: {
          id: liked.id
        },
        data: {
          react: this.getReaction(react)
        }
      })
      return like
    }
    like = await this.prismaService.like.create({
      data: {
        userId: user.id,
        postId: id,
        react: this.getReaction(react)
      },
    });

    const post = await this.prismaService.post.findUnique({
      where: {
        id,
      },
    });

    if (user.id != post.userId) {
      const noti = await this.prismaService.notification.create({
        data: {
          interactedId: user.id,
          notifiedId: post.userId,
          notiType: 'LIKE',
          postId: id,
        },
      });

      const socketId = await this.getNotifiedUserSocketId(noti.notifiedId);
      this.chatGateway.server
        .to(socketId)
        .emit('onNotification', 'New Notification!');

      return {
        like,
        noti,
      };
    }

    return {
      like: like,
    };
  }

  async dislikePost(user: User, id: string) {
    const liked = await this.prismaService.like.findFirst({
      where: {
        postId: id,
        userId: user.id,
      },
    });

    if (!liked) throw new ForbiddenException("You haven't liked this post yet");
    await this.prismaService.like.delete({
      where: {
        id: liked.id,
      },
    });

    const post = await this.prismaService.post.findUnique({
      where: {
        id,
      },
    });

    if (user.id != post.userId) {
      await this.prismaService.notification.deleteMany({
        where: {
          interactedId: user.id,
          notifiedId: post.userId,
          notiType: 'LIKE',
          postId: id,
        },
      });
      return 'Like and noti removed';
    }

    return 'Like removed';
  }

  async comment(user: User, id: string, dto: CommentDto) {
    const cmt = await this.prismaService.comment.create({
      data: {
        postId: id,
        comment: dto.comment,
        userId: user.id,
      },
    });

    const post = await this.prismaService.post.findUnique({
      where: {
        id,
      },
    });

    if (user.id != post.userId) {
      const noti = await this.prismaService.notification.create({
        data: {
          interactedId: user.id,
          notifiedId: post.userId,
          notiType: 'COMMENT',
          postId: post.id,
        },
      });

      const socketId = await this.getNotifiedUserSocketId(noti.notifiedId);
      this.chatGateway.server
        .to(socketId)
        .emit('onNotification', 'New Notification!');

      return {
        cmt,
        noti,
      };
    }

    return {
      cmt: cmt,
    };
  }

  async followUser(user: User, id: string) {
    if (user.id === id)
      throw new ForbiddenException("You can't follow yourself");

    if (await this.checkIfUserFollowed(user, id))
      throw new ForbiddenException('You followed this user');

    const follow = await this.prismaService.follow.create({
      data: {
        followerId: id,
        followingId: user.id,
      },
    });
    const noti = await this.prismaService.notification.create({
      data: {
        interactedId: user.id,
        notifiedId: id,
        notiType: 'FOLLOW',
      },
    });

    const socketId = await this.getNotifiedUserSocketId(noti.notifiedId);
    this.chatGateway.server
      .to(socketId)
      .emit('onNotification', 'New Notification!');

    return {
      follow,
      noti,
    };
  }

  async checkIfUserFollowed(user: User, id: string) {
    await this.prismaService.user.findUniqueOrThrow({
      where: {
        id,
      },
    });

    return (
      (await this.prismaService.follow.findFirst({
        where: {
          followerId: id,
          followingId: user.id,
        },
      })) !== null
    );
  }

  async unfollowUser(user: User, id: string) {
    if (!(await this.checkIfUserFollowed(user, id))) {
      throw new ForbiddenException("You didn't follow this user");
    }
    await this.prismaService.follow.deleteMany({
      where: {
        followerId: id,
        followingId: user.id,
      },
    });
    await this.prismaService.notification.deleteMany({
      where: {
        interactedId: user.id,
        notifiedId: id,
        notiType: 'FOLLOW',
      },
    });
    return 'Follow and noti deleted';
  }

  async getUserNotification(user: User) {
    const notiList = await this.prismaService.notification.findMany({
      where: {
        notifiedId: user.id,
      },
      select: {
        id: true,
        interacted: {
          select: {
            id: true,
            username: true,
            ava: true,
          },
        },
        postId: true,
        notiType: true,
        read: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const notifications: any[] = [];
    for (const noti of notiList) {
      let message = '';
      switch (noti.notiType) {
        case 'FOLLOW':
          message = `started following you.`;
          break;
        case 'LIKE':
          message = `liked your post`;
          break;
        case 'COMMENT':
          message = `commented on your post`;
          break;
        case 'REPORT':
          message = `Your post was marked violated and deleted. Tell me if this was a mistake.`;
        default:
          break;
      }
      notifications.push({
        id: noti.id,
        interacted: noti.interacted,
        postId: noti.postId,
        message,
        read: noti.read,
        createdAt: noti.createdAt,
        notiType: noti.notiType
      });
    }
    return notifications;
  }

  async readNoti(user: User, id: string) {
    const noti = await this.prismaService.notification.findFirstOrThrow({
      where: {
        id,
      },
    });

    if (noti.notifiedId !== user.id)
      throw new ForbiddenException('Not your noti');

    return await this.prismaService.notification.update({
      where: {
        id,
      },
      data: {
        read: true,
      },
    });
  }

  async sharePost(user: User, dto: ShareDto) {
    const recipient = await this.chatService.findRecipient(user, dto.userId);
    const conversation = await this.chatService.findConversation(
      user,
      recipient,
    );

    const text = await this.prismaService.message.create({
      data: {
        message: dto.link,
        senderId: user.id,
        conversationId: conversation.id,
      },
    });
    console.log(text);

    this.chatGateway.server.to(recipient.socketId).emit('onMessage', {
      senderId: text.senderId,
      message: text.message,
      createdAt: text.createdAt,
    });
    return 'Message sent';
  }

  async getNotifiedUserSocketId(notifiedId: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: notifiedId,
      },
      select: {
        socketId: true,
      },
    });
    return user.socketId;
  }
}
