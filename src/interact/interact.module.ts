import { Module } from '@nestjs/common';
import { InteractController } from './interact.controller';
import { InteractService } from './interact.service';
import { ChatModule } from 'src/chat/chat.module';
import { ChatService } from 'src/chat/chat.service';

@Module({
  controllers: [InteractController],
  providers: [InteractService, ChatService],
  imports: [ChatModule]
})
export class InteractModule {}
