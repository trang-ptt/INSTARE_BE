import { MailerService } from '@nestjs-modules/mailer';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as argon from 'argon2';
import { PrismaService } from './../prisma/prisma.service';
import { AuthDto } from './dto/auth.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyDto } from './dto/verify.dto';

@Injectable({})
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailerService: MailerService,
  ) {}
  async signUpAfterVerify(dto: VerifyDto) {
    try {
      //find mail
      const mailOTP = await this.prisma.mail_Otp.findUnique({
        where: {
          email: dto.email,
        },
      });

      //save new user in db
      if (mailOTP && dto.otp == mailOTP.otp) {
        const user = await this.prisma.user.create({
          data: {
            email: mailOTP.email,
            password: mailOTP.password,
            username: mailOTP.username,
          },
        });

        await this.prisma.mail_Otp.delete({
          where: {
            email: dto.email,
          },
        });

        delete user.password;
        return this.signToken(user.id, user.email);
      }
      return {
        message: "OTP's incorrect or email's invalid",
      };
    } catch (error) {
      throw error;
    }
  }

  validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      );
  };

  async signIn(dto: SignInDto) {
    //find user by email or username
    let user: User = null;
    if (this.validateEmail(dto.emailOrUsername)) {
      user = await this.prisma.user.findUnique({
        where: {
          email: dto.emailOrUsername,
        },
      });
    } else {
      user = await this.prisma.user.findUnique({
        where: {
          username: dto.emailOrUsername,
        },
      });
    }
    if (!user) {
      //if user not exist throw
      throw new ForbiddenException("user's not exist");
    }

    if (user.accessFailedCount > 0)
      throw new ForbiddenException("user's BANNED");
    //compare password
    const pwMatches = await argon.verify(user.password, dto.password);
    //if password incorrect throw
    if (!pwMatches) {
      throw new ForbiddenException('Password incorrect');
    }
    //send back user
    delete user.password;
    return this.signToken(user.id, user.email);
  }

  async signToken(userId: string, email: string) {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      // expiresIn: '24h',
      secret: secret,
    });

    return {
      access_token: token,
    };
  }

  async verifyEmailForSignUp(dto: SignUpDto) {
    const otp = Math.floor(Math.random() * (1000000 - 100000) + 100000);
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (user) {
      throw new ForbiddenException('Credential taken');
    }

    if (dto.password.length < 6)
      throw new ForbiddenException('Password must be more than 6 characters!');

    const regexPattern = /^[a-zA-Z0-9\-_\.]+$/;
    if (!regexPattern.test(dto.username))
      throw new ForbiddenException(
        'Username can only contain letters, numbers, dashes, underscores and periods',
      );

    const existed = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
    });

    if (existed) throw new ForbiddenException('This username was taken');

    const mailOTP = await this.prisma.mail_Otp.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (mailOTP)
      await this.prisma.mail_Otp.delete({
        where: {
          email: dto.email,
        },
      });

    await this.mailerService.sendMail({
      to: dto.email,
      from: this.config.get('MAIL_FROM'),
      subject: 'Verification code from InStare',
      text: 'Please enter your verification code: ' + otp,
    });

    //generate password hash
    const hash = await argon.hash(dto.password);

    const save = await this.prisma.mail_Otp.create({
      data: {
        email: dto.email,
        password: hash,
        username: dto.username,
        otp,
      },
    });
    return {
      message: 'OTP sent',
      email: save.email,
    };
  }

  async verifyEmailForgotPassword(email: string) {
    const otp = Math.floor(Math.random() * (1000000 - 100000) + 100000);
    const user = await this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      throw new ForbiddenException("Email doesn't exist in our system");
    }
    const mailOTP = await this.prisma.mail_Otp.findUnique({
      where: {
        email,
      },
    });

    if (mailOTP)
      await this.prisma.mail_Otp.delete({
        where: {
          email,
        },
      });

    await this.mailerService.sendMail({
      to: email,
      from: this.config.get('MAIL_FROM'),
      subject: 'Reset password verification code from Katlia Fashion',
      text: 'Please enter your verification code: ' + otp,
    });

    const save = await this.prisma.mail_Otp.create({
      data: {
        email,
        otp,
      },
    });

    return {
      message: 'OTP sent',
      email: save.email,
    };
  }

  async checkOTPForgotPassword(dto: VerifyDto) {
    const mailOTP = await this.prisma.mail_Otp.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (mailOTP && dto.otp == mailOTP.otp) {
      return {
        email: mailOTP.email,
        message: 'OTP correct',
      };
    } else throw new ForbiddenException('OTP incorrect');
  }

  async newPasswordAfterVerify(dto: AuthDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });
    if (!user) throw new ForbiddenException('WTF');

    const hash = await argon.hash(dto.password);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hash,
      },
    });
    return 'Password changed';
  }

  verifyJwt(token: string): Promise<any> {
    return this.jwt.verifyAsync(token, {
      secret: process.env.JWT_SECRET,
    });
  }
}
