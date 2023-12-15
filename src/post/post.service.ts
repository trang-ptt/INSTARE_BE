import { ForbiddenException, Injectable } from '@nestjs/common';
import { NotiType, User } from '@prisma/client';
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

    if (dto.tagUserIdList.length > 0) {
      const tags = [],
        noti = [];
      dto.tagUserIdList.forEach((userId) => {
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
      });

      Promise.all([
        await this.prismaService.tag.createMany({
          data: tags,
        }),
        await this.prismaService.notification.createMany({
          data: noti,
        }),
        dto.tagUserIdList.forEach(async (id) => {
          const socketId = await this.getNotifiedUserSocketId(id);
          this.chatGateway.server
            .to(socketId)
            .emit('onNotification', 'New Notification!');
        }),
      ]).catch((error) => {
        throw error;
      });
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
      where: {
        deletedAt: undefined,
      },
      select: {
        id: true,
        mediaList: true,
        caption: true,
        layout: true,
        emotion: true,
        createdAt: true,
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
      if (post.user.accessFailedCount === 0) {
        returnPosts.push({
          ...post,
          liked: post.likes.some((entry) => entry.userId === user.id),
        });
        post.likes.forEach((like) => {
          delete like.userId
        })
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
