import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CloudinaryService } from 'nestjs-cloudinary';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { StoryService } from './story.service';

@ApiTags('Story')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('story')
export class StoryController {
  constructor(
    private cloudinaryService: CloudinaryService,
    private storyService: StoryService,
  ) {}

  @Post('createStory')
  @UseInterceptors(FileInterceptor('file'))
  async createStory(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) throw new ForbiddenException('A media is required');
      const uploaded = await this.cloudinaryService.uploadFile(file);
      console.log(uploaded.url);
      return await this.storyService.createStory(user, uploaded.url);
    } catch (error) {
      throw error;
    }
  }

  @Get('getAllStoryBoxes')
  async getAllStories(@GetUser() user: User) {
    return await this.storyService.getAllStories(user);
  }

  @Get('getUserStories/:id')
  getUserStories(@Param('id') id: string) {
    return this.storyService.getUserStories(id);
  }

  @Post('readStory/:id')
  readStory(@GetUser() user: User, @Param('id') id: string) {
    return this.storyService.readStory(user, id);
  }
}
