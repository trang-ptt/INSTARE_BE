import { ForbiddenException, Injectable } from '@nestjs/common';
import { NotiType, User } from '@prisma/client';
import { redisClient } from 'src/app.consts';
import { ChatGateway } from 'src/chat/chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { PostDto } from './dto';

@Injectable()
export class PostService {
  constructor(
    private prismaService: PrismaService,
    private chatGateway: ChatGateway,
  ) {}

  async createPost(user: User, dto: PostDto, arrayURL: string[]) {
    const channelName = `instare:post`;
    const redis = redisClient.duplicate();

    const tagUserIdList = dto.tagUserIdList
      ? dto.tagUserIdList.trim().split(',')
      : null;
    const post = await this.prismaService.post.create({
      data: {
        userId: user.id,
        mediaList: arrayURL,
        caption: dto.caption,
        thumbnail: arrayURL[0],
        layout: parseInt(dto.layout?.toString()) || 1,
        emotion: dto.emotion,
      },
    });

    redis.connect();
    await redis.publish(channelName, post.id);

    if (tagUserIdList) {
      const tags = [],
        noti = [];
      for (const userId of tagUserIdList) {
        tags.push({
          postId: post.id,
          userId,
        });
        noti.push({
          interactedId: user.id,
          notifiedId: userId,
          notiType: NotiType.TAG,
          postId: post.id,
        });
      }

      await Promise.all([
        this.prismaService.tag.createMany({
          data: tags,
        }),
        this.prismaService.notification.createMany({
          data: noti,
        }),
      ]).catch((error) => {
        throw error;
      });

      for (const userId of tagUserIdList) {
        const socketId = await this.getNotifiedUserSocketId(userId);
        this.chatGateway.server
          .to(socketId)
          .emit('onNotification', 'New Notification!');
      }
    }

    return post;
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

  async getAllPosts(user: User) {
    const posts = await this.prismaService.post.findMany({
      select: {
        id: true,
        mediaList: true,
        caption: true,
        layout: true,
        emotion: true,
        createdAt: true,
        deletedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            ava: true,
            accessFailedCount: true,
          },
        },
        likes: {
          select: {
            userId: true,
            react: true,
          },
        },
        tags: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                ava: true
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const returnPosts: any[] = [];

    for (const post of posts) {
      if (post.user.accessFailedCount === 0 && !post.deletedAt) {
        const likeIndex = post.likes.findIndex(
          (item) => item.userId === user.id,
        );
        returnPosts.push({
          ...post,
          liked: post.likes[likeIndex]?.react || null,
        });
      }
      delete post.user.accessFailedCount;
    }
    return returnPosts;
  }

  async checkIfUserLikePost(user: User, id: string) {
    const like = await this.prismaService.like.findFirst({
      where: {
        userId: user.id,
        postId: id,
      },
    });
    return like?.react || null;
  }

  async deletePost(user: User, id: string) {
    const post = await this.prismaService.post.findUnique({
      where: {
        id,
      },
    });

    if (!post) throw new ForbiddenException('Post not exist');
    if (post.userId !== user.id)
      throw new ForbiddenException(`You can't delete other people's post`);
    if (post.deletedAt) throw new ForbiddenException('Post already deleted');

    await this.prismaService.post.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      code: 'SUCCESS',
    };
  }
}
