import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PostDto } from './dto';

@Injectable()
export class PostService {
  constructor(private prismaService: PrismaService) {}

  async createPost(user: User, dto: PostDto, arrayURL: string[]) {
    const post = await this.prismaService.post.create({
      data: {
        userId: user.id,
        mediaList: arrayURL,
        caption: dto.caption,
        thumbnail: arrayURL[0],
      },
    });
    return post;
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
          where: {
            userId: user.id,
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
      if (post.user.accessFailedCount === 0)
        returnPosts.push({
          ...post,
          liked: post.likes.length > 0,
        });
      delete post.likes;
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
    return like != null;
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
