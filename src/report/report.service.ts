import { MailerService } from '@nestjs-modules/mailer';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { ChatGateway } from 'src/chat/chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReportDTO, ResolveReportDTO } from './dto';

@Injectable()
export class ReportService {
  constructor(
    private prismaService: PrismaService,
    private chatGateway: ChatGateway,
    private config: ConfigService,
    private mailerService: MailerService,
  ) {}

  isAdmin(user: User) {
    if (user.accountType !== 'ADMIN')
      throw new ForbiddenException('Permission required');
  }

  async createReport(user: User, dto: ReportDTO) {
    let { userId } = dto;
    const { postId, reason } = dto;
    if (!userId && !postId) {
      throw new ForbiddenException(
        'Please provide userId for profile report or postId for post report',
      );
    }

    if (userId) {
      const existUser = await this.prismaService.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!existUser)
        throw new ForbiddenException(`User with id ${userId} does not exist`);
    }

    if (postId) {
      const post = await this.prismaService.post.findUnique({
        where: {
          id: postId,
        },
      });
      userId = post.userId;
      if (!post)
        throw new ForbiddenException(`Post with id ${postId} does not exist`);
    }

    if (userId === user.id)
      throw new ForbiddenException(`You can't report yourself`);

    let report = await this.prismaService.report.findFirst({
      where: {
        reportedUserId: userId,
        postId: postId || undefined,
        resolved: false,
      },
    });

    if (!report) {
      report = await this.prismaService.report.create({
        data: {
          reportedUserId: userId,
          postId: postId,
          type: postId ? 'POST' : 'USER',
        },
      });
    }

    await this.prismaService.reportReason.create({
      data: {
        userId: user.id,
        reportId: report.id,
        reason,
      },
    });

    const socketIds = await this.getAdminsSocketId();
    for (const id of socketIds) {
      this.chatGateway.server.to(id).emit('onReport', 'New Report!');
    }

    return {
      code: 'SUCCESS',
    };
  }

  async getAdminsSocketId(): Promise<string[]> {
    const ids = [];
    const admins = await this.prismaService.user.findMany({
      where: {
        accountType: 'ADMIN',
      },
    });
    for (const admin of admins) {
      ids.push(admin.socketId);
    }
    return ids;
  }

  getPostReports() {
    return this.prismaService.report.findMany({
      where: {
        type: 'POST',
      },
      select: {
        id: true,
        resolved: true,
        reportedUser: {
          select: {
            id: true,
            username: true,
            ava: true,
          },
        },
        postId: true,
        _count: {
          select: {
            reportReason: true,
          },
        },
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  getProfileReports() {
    return this.prismaService.report.findMany({
      where: {
        type: 'USER',
      },
      select: {
        id: true,
        resolved: true,
        reportedUser: {
          select: {
            id: true,
            username: true,
            ava: true,
          },
        },
        _count: {
          select: {
            reportReason: true,
          },
        },
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async viewReport(id: string) {
    const report = await this.prismaService.report.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        resolved: true,
        result: true,
        postId: true,
        reportedUserId: true,
      },
    });

    if (!report) throw new ForbiddenException('Report not found');

    const reasons = await this.prismaService.reportReason.findMany({
      where: {
        reportId: id,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        reason: true,
        createdAt: true,
      },
    });

    if (report.postId) {
      const post = await this.prismaService.post.findUnique({
        where: {
          id: report.postId,
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
          deletedAt: true,
          deleteReason: true,
        },
      });
      if (!post) throw new ForbiddenException('Post not found');

      return {
        report,
        reasons,
        post,
      };
    } else {
      const profile: any = await this.prismaService.user.findUnique({
        where: {
          id: report.reportedUserId,
        },
        select: {
          id: true,
          username: true,
          name: true,
          bio: true,
          ava: true,
          accessFailedCount: true,
          _count: {
            select: {
              posts: true,
              following: true,
              follower: true,
            },
          },
        },
      });

      if (!profile) throw new ForbiddenException('Profile not exist');

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

      return {
        report,
        reasons,
        profile,
      };
    }
  }

  async resolveReport(user: User, id: string, dto: ResolveReportDTO) {
    const { violated, reason } = dto;
    const report = await this.prismaService.report.findUnique({
      where: {
        id,
      },
    });

    if (!report) throw new ForbiddenException('Report not found');
    if (report.resolved)
      throw new ForbiddenException('Report already resolved');
    if (violated === true && !reason)
      throw new ForbiddenException(
        'Please give a reason why this post/user is violated',
      );
    const profile = await this.prismaService.user.findUnique({
      where: {
        id: report.reportedUserId,
      },
    });
    if (!profile) throw new ForbiddenException('User not found');
    if (report.postId) {
      const post = await this.prismaService.post.findUnique({
        where: {
          id: report.postId,
        },
      });
      if (!post) throw new ForbiddenException('Post not found');
      if (post.deletedAt) {
        await this.prismaService.report.update({
          where: {
            id,
          },
          data: {
            resolved: true,
          },
        });
        throw new ForbiddenException('Post already deleted');
      }
      if (violated === true) {
        await this.prismaService.post.update({
          where: {
            id: report.postId,
          },
          data: {
            deletedAt: new Date(),
            deleteReason: reason,
          },
        });

        await this.prismaService.notification.create({
          data: {
            interactedId: user.id,
            notifiedId: post.userId,
            notiType: 'REPORT',
            postId: id,
          },
        });
        this.chatGateway.server
          .to(profile.socketId)
          .emit('onNotification', 'New Notification!');
      }
    } else {
      if (profile.accessFailedCount > 0)
        throw new ForbiddenException('Profile already banned');
      if (violated === true) {
        await this.prismaService.user.update({
          where: {
            id: report.reportedUserId,
          },
          data: {
            accessFailedCount: 1,
            banReason: reason,
          },
        });

        this.chatGateway.server
          .to(profile.socketId)
          .emit('onBanned', 'Your account has been banned!');

        await this.mailerService.sendMail({
          to: profile.email,
          from: this.config.get('MAIL_FROM'),
          subject: 'Your account has been banned',
          text:
            'Your account was marked violated and banned due to reason: ' +
            reason,
        });
      }
    }
    await this.prismaService.report.update({
      where: {
        id,
      },
      data: {
        resolved: true,
        result: violated ? 'VIOLATED' : 'NORMAL',
      },
    });

    return {
      code: 'SUCCESS',
    };
  }
}
