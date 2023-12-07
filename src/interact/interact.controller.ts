import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { CommentDto } from './dto/cmt.dto';
import { ShareDto } from './dto/share.dto';
import { InteractService } from './interact.service';
import { LikeDTO } from './dto/like.dto';

@ApiTags('Interact')
@UseGuards(JwtGuard)
@ApiBearerAuth()
@Controller('interact')
export class InteractController {
  constructor(private interactService: InteractService) {}
  @Post('likePost/:id')
  likePost(@GetUser() user: User, @Param('id') id: string, @Query() dto: LikeDTO) {
    return this.interactService.likePost(user, id, dto.react.toUpperCase());
  }

  @Delete('dislikePost/:id')
  dislikePost(@GetUser() user: User, @Param('id') id: string) {
    return this.interactService.dislikePost(user, id);
  }

  @Post('comment/:id')
  comment(
    @GetUser() user: User,
    @Param('id') id: string,
    @Body() dto: CommentDto,
  ) {
    return this.interactService.comment(user, id, dto);
  }

  @Post('followUser/:id')
  followUser(@GetUser() user: User, @Param('id') id: string) {
    return this.interactService.followUser(user, id);
  }

  @Get('checkIfUserFollowed/:id')
  checkIfUserFollowed(@GetUser() user: User, @Param('id') id: string) {
    return this.interactService.checkIfUserFollowed(user, id);
  }

  @Delete('unfollowUser/:id')
  unfollowUser(@GetUser() user: User, @Param('id') id: string) {
    return this.interactService.unfollowUser(user, id);
  }

  @Get('getUserNotification')
  getUserNotification(@GetUser() user: User) {
    return this.interactService.getUserNotification(user);
  }

  @Patch('readNoti/:id')
  readNoti(@GetUser() user: User, @Param('id') id: string) {
    return this.interactService.readNoti(user, id);
  }

  @Post('sharePost')
  sharePost(@GetUser() user: User, @Body() dto: ShareDto) {
    return this.interactService.sharePost(user, dto);
  }
}
