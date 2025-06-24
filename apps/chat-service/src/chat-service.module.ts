import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ChatServiceController } from './chat-service.controller';
import { ChatServiceService } from './chat-service.service';
import { AuthModule, AuthGuard } from '@app/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env', '../../../.env'],
    }),
    AuthModule
  ],
  controllers: [ChatServiceController],
  providers: [
    ChatServiceService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class ChatServiceModule {}
