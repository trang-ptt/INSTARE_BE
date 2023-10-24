import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CloudinaryService } from 'nestjs-cloudinary';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { PostDto } from './dto';
import { PostService } from './post.service';

@ApiTags('Post')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('post')
export class PostController {
  constructor(
    private cloudinaryService: CloudinaryService,
    private postService: PostService,
  ) {}

  @Post('createPost')
  @UseInterceptors(FilesInterceptor('files'))
  async createPost(
    @GetUser() user: User,
    @Body() dto: PostDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    try {
      if (!files) throw new ForbiddenException('A media is required');
      if (files.length > 10)
        throw new ForbiddenException('Maximum of 10 files');
      const arrayUrl: string[] = [];
      for (const file of files) {
        const uploaded = await this.cloudinaryService.uploadFile(file, {
          resource_type: 'auto',
        });
        console.log(uploaded.url);
        arrayUrl.push(uploaded.url);
      }
      return this.postService.createPost(user, dto, arrayUrl);
    } catch (error) {
      throw error;
    }
  }

  @Get('getAllPosts')
  getAllPosts(@GetUser() user: User) {
    return this.postService.getAllPosts(user);
  }

  @Get('checkIfUserLikePost/:id')
  checkIfUserLikePost(@GetUser() user: User, @Param('id') id: string) {
    return this.postService.checkIfUserLikePost(user, id);
  }
}
