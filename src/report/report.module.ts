import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  providers: [ReportService],
  controllers: [ReportController],
  imports: [ChatModule]
})
export class ReportModule {}
