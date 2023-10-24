import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StoryService {
  constructor(private prismaService: PrismaService) {}

  async createStory(user: User, url: string) {
    return await this.prismaService.story.create({
      data: {
        userId: user.id,
        media: url,
        expiredAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      },
    });
  }

  async getAllStories(user: User) {
    const unread = await this.prismaService.story.groupBy({
      by: ['userId'],
      where: {
        expiredAt: {
          gte: new Date(),
        },
        readStories: {
          none: {
            userId: user.id,
          },
        },
      },
    });

    const read = await this.prismaService.story.groupBy({
      by: ['userId'],
      where: {
        expiredAt: {
          gte: new Date(),
        },
        readStories: {
          some: {
            userId: user.id,
          },
        },
      },
    });

    const stories: any[] = [];
    const userIds: string[] = [];
    for (const str of unread) {
      const user: any = await this.getStoryBox(str.userId);
      user.read = false;
      stories.push(user);
      userIds.push(str.userId);
    }
    for (const str of read) {
      if (userIds.includes(str.userId)) continue;
      const user: any = await this.getStoryBox(str.userId);
      user.read = true;
      stories.push(user);
      userIds.push(str.userId);
    }
    return stories;
  }

  async getStoryBox(id: string) {
    return await this.prismaService.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        ava: true,
      },
    });
  }

  async getUserStories(id: string) {
    return await this.prismaService.story.findMany({
      where: {
        userId: id,
        expiredAt: {
          gte: new Date(),
        },
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
        media: true,
        createdAt: true,
        expiredAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async readStory(user: User, id: string) {
    const read = await this.prismaService.readStory.findFirst({
      where: {
        userId: user.id,
        storyId: id,
      },
    });
    if (read) throw new ForbiddenException('You read this story');
    return await this.prismaService.readStory.create({
      data: {
        userId: user.id,
        storyId: id,
      },
    });
  }
}
