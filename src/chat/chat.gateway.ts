import { OnModuleInit, UnauthorizedException } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { User } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import { redisClient } from 'src/app.consts';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:2041'],
  },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private authService: AuthService,
    private prismaService: PrismaService,
    private chatService: ChatService,
  ) {}

  async onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log(socket.id);
    });

    const redis = redisClient;
    await redis.connect();
    const listener = async (postId, channel) => {
      console.log(postId, channel);
      const post = await this.prismaService.post.findUnique({
        where: {
          id: postId,
        },
      });
      const followers = await this.prismaService.follow.findMany({
        where: {
          followerId: post.userId,
        },
        select: {
          id: true,
          followerId: true,
          followingId: true,
          following: {
            select: {
              socketId: true,
            },
          },
        },
      });
      await Promise.all(
        followers.map(async (follower) => {
          await this.prismaService.notification.create({
            data: {
              interactedId: post.userId,
              notifiedId: follower.followingId,
              notiType: 'POST',
              postId,
            },
          });
          this.server
            .to(follower.following.socketId)
            .emit('onNotification', 'New Notification!');
        }),
      );
    };
    await redis.subscribe('instare:post', listener);
  }

  async handleConnection(client: Socket) {
    try {
      const decodedToken = await this.authService.verifyJwt(
        client.handshake.headers.authorization.split(' ')[1],
      );
      const user = await this.prismaService.user.findUnique({
        where: {
          id: decodedToken.sub,
        },
      });
      delete user.password;

      if (!user) {
        return this.disconnect(client);
      } else {
        await this.prismaService.user.update({
          where: {
            id: user.id,
          },
          data: {
            socketId: client.id,
          },
        }),
          (client.data.user = user);
      }

      client.emit('init', {
        message: 'Welcome to the live server!',
      });
    } catch (error) {
      console.log(error);
      return this.disconnect(client);
    }
  }

  async handleDisconnect(client: Socket) {
    // remove connection from DB
    client.disconnect();
  }

  private disconnect(client: Socket) {
    client.emit('Error', new UnauthorizedException());
    client.disconnect();
  }

  //payload: { userId, message }
  @SubscribeMessage('message')
  async handleMessage(client: any, payload: any) {
    if (!client.data.user) await this.handleConnection(client);
    const user: User = await client.data.user;
    const recipient = await this.chatService.findRecipient(
      user,
      payload.userId,
    );
    const conversation = await this.chatService.findConversation(
      user,
      recipient,
    );

    await this.chatService.readMessages(conversation, recipient);

    const text = await this.prismaService.message.create({
      data: {
        message: payload.message,
        senderId: user.id,
        conversationId: conversation.id,
      },
    });
    console.log('from chat');
    console.log(text);

    this.server.to(recipient.socketId).emit('onMessage', {
      senderId: text.senderId,
      message: text.message,
      createdAt: text.createdAt,
    });
    return;
  }
}
