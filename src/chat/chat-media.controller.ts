import { ChatService } from 'src/chat/chat.service';
import {
  Controller,
  ForbiddenException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CloudinaryService } from 'nestjs-cloudinary';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('chat/media')
export class ChatMediaController {
  constructor(
    private chatGateway: ChatGateway,
    private chatService: ChatService,
    private cloudinaryService: CloudinaryService,
    private prismaService: PrismaService
  ) {}

  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'userId',
    type: 'string'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'file',
        },
      },
    },
  })
  @Post(':userId')
  async sendAttachment(
    @GetUser() user: User,
    @Param('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new ForbiddenException('A media is required');
    const uploaded = await this.cloudinaryService.uploadFile(file);

    const recipient = await this.chatService.findRecipient(
      user,
      userId,
    );
    const conversation = await this.chatService.findConversation(
      user,
      recipient,
    );

    await this.chatService.readMessages(conversation, recipient);

    const text = await this.prismaService.message.create({
      data: {
        message: uploaded.url,
        senderId: user.id,
        conversationId: conversation.id,
      },
    });
    console.log('from chat');
    console.log(text);

    this.chatGateway.server.to(recipient.socketId).emit('onMessage', {
      senderId: text.senderId,
      message: text.message,
      createdAt: text.createdAt,
    });
  
    return {
      code: 'SUCCESS',
    };
  }
}
