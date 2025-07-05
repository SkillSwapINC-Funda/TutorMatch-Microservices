import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ClassroomServiceController } from './classroom-service.controller';
import { ClassroomServiceService } from './classroom-service.service';
import { JitsiController } from './jitsi/jitsi.controller';
import { JitsiService } from './jitsi/jitsi.service';
import { AuthModule, AuthGuard } from '@app/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env', '../../../.env'],
    }),
    AuthModule
  ],
  controllers: [
    ClassroomServiceController,
    JitsiController
  ],
  providers: [
    ClassroomServiceService,
    JitsiService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [JitsiService]
})
export class ClassroomServiceModule {}
