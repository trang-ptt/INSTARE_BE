import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { PostModule } from './post/post.module';
import { StoryModule } from './story/story.module';
import { NoAuthModule } from './no-auth/no-auth.module';
import { InteractModule } from './interact/interact.module';
import { ChatModule } from './chat/chat.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    PrismaModule,
    MailModule,
    PostModule,
    StoryModule,
    NoAuthModule,
    InteractModule,
    ChatModule,
    ReportModule
  ],
})
export class AppModule {}
