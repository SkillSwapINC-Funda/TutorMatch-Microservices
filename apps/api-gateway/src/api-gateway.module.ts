import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { AuthController } from './auth/auth.controller';
import { AuthModule, AuthGuard } from '@app/shared';

@Module({
  imports: [AuthModule],
  controllers: [ApiGatewayController, AuthController],
  providers: [
    ApiGatewayService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class ApiGatewayModule {}
