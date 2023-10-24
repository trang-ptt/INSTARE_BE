import { PrismaService } from './../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(
    private config: ConfigService,
    private mailerService: MailerService,
    private prisma: PrismaService,
  ) {}
}
