import { ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProfileDto } from './dto';
import { ChangePassDto } from './dto/change-pass.dto';

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}

  async uploadAva(user: User, file: string) {
    const up = await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        ava: file,
      },
    });
    return up.ava;
  }

  async updateProfile(user: User, dto: ProfileDto) {
    let up: any = {};
    if (dto.bio || dto.name) {
      up = await this.prismaService.user.update({
        where: {
          id: user.id,
        },
        data: {
          name: dto.name,
          bio: dto.bio,
        },
      });
    }

    if (dto.username) {
      const existed = await this.prismaService.user.findUnique({
        where: {
          username: dto.username,
        },
      });

      if (existed && existed.id !== user.id)
        throw new ForbiddenException('This username was taken');

      //count date
      const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
      const today = new Date();
      const changedDay = user.usernameLastChanged;

      const diffDays = Math.round(
        Math.abs((today.getTime() - changedDay.getTime()) / oneDay),
      );
      if (diffDays >= 14 && user.username !== dto.username) {
        up = await this.prismaService.user.update({
          where: {
            id: user.id,
          },
          data: {
            username: dto.username,
            usernameLastChanged: new Date(),
          },
        });
        return up;
      } else if (user.username === dto.username) return up;
      else {
        up.message = `There is ${
          14 - diffDays
        } day(s) left until you can change your username.`;
      }
    }
    return up;
  }

  async getProfile(user: User) {
    const profile: any = await this.prismaService.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        ava: true,
        usernameLastChanged: true,
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
        userId: user.id,
        deletedAt: undefined
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

  async changePassword(user: User, dto: ChangePassDto) {
    const usr = await this.prismaService.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (await argon.verify(usr.password, dto.oldPass)) {
      if (dto.newPass.length >= 6) {
        if (dto.newPass === dto.confirmPass) {
          const hash = await argon.hash(dto.newPass);
          await this.prismaService.user.update({
            where: {
              id: user.id,
            },
            data: {
              password: hash,
            },
          });
        } else {
          throw new ForbiddenException('Confirm password incorrect!');
        }
      } else {
        throw new ForbiddenException(
          'Password must be more than 6 characters!',
        );
      }
    } else {
      throw new ForbiddenException('Old password incorrect');
    }
  }

  async removeAva(user: User) {
    return await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        ava: null,
      },
    });
  }
}
