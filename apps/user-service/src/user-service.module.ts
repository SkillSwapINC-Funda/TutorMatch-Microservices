import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserServiceController } from './user-service.controller';
import { UserServiceService } from './user-service.service';
import { AuthModule, AuthGuard } from '@app/shared';

@Module({
  imports: [AuthModule],
  controllers: [UserServiceController],
  providers: [
    UserServiceService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class UserServiceModule {}
