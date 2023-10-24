import { Module } from '@nestjs/common';
import { NoAuthController } from './no-auth.controller';
import { NoAuthService } from './no-auth.service';

@Module({
  controllers: [NoAuthController],
  providers: [NoAuthService]
})
export class NoAuthModule {}
