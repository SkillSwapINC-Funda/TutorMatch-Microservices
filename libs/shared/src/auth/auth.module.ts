import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthService } from './auth.service';
import { ErrorsInterceptor } from './errors.interceptor';

@Module({
  providers: [
    AuthService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorsInterceptor,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
