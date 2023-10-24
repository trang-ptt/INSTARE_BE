import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from 'nestjs-cloudinary';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [
    CloudinaryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        isGlobal: true,
        cloud_name: configService.get('CLOUDINARY_CLOUDNAME'),
        api_key: configService.get('CLOUDINARY_APIKEY'),
        api_secret: configService.get('CLOUDINARY_APISECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
