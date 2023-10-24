import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NoAuthService {
  constructor(private prismaService: PrismaService) {}
  searchUser(search: string) {
    return this.prismaService.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        ava: true,
        name: true,
      },
    });
  }

  viewPost(id: string) {
    return this.prismaService.post.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            username: true,
            ava: true,
          },
        },
        caption: true,
        mediaList: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
          },
        },
        comments: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                ava: true,
                username: true,
              },
            },
            comment: true,
          },
        },
      },
    });
  }

  async viewUserProfile(username: string) {
    const profile: any = await this.prismaService.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        ava: true,
        _count: {
          select: {
            posts: true,
            following: true,
            follower: true,
          },
        },
      },
    });

    const postList = await this.prismaService.post.findMany({
      where: {
        userId: profile.id,
      },
    });

    //is Video
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv)$/i;
    const posts: any[] = [];
    for (const post of postList) {
      posts.push({
        id: post.id,
        thumbnail: post.thumbnail,
        multiple: post.mediaList.length > 1,
        containVideo: videoExtensions.test(post.mediaList[0]),
      });
    }
    profile.posts = posts;
    return profile;
  }
}
