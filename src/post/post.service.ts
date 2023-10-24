import { Injectable } from '@nestjs/common';
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
    const posts: any = await this.prismaService.post.findMany({
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

    for (const post of posts) {
      post.liked = post.likes.length > 0;
      delete post.likes;
    }
    return posts;
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
}
