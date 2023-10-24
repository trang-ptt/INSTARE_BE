import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtGuard } from 'src/auth/guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from 'src/auth/decorator';
import { User } from '@prisma/client';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('enterConversation/:userId')
  enterConversation(@GetUser() user: User, @Param('userId') userId: string) {
    return this.chatService.enterConversation(user, userId);
  }

  @Get('getListContact')
  getListContact(@GetUser() user: User) {
    return this.chatService.getListContact(user)
  }
}
