import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { ClassroomServiceController } from './classroom-service.controller';
import { ClassroomServiceService } from './classroom-service.service';
import { JitsiController } from './jitsi/jitsi.controller';
import { JitsiService } from './jitsi/jitsi.service';
import { MaterialsController } from './materials/materials.controller';
import { MaterialsService } from './materials/materials.service';
import { AuthModule, AuthGuard } from '@app/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env', '../../../.env'],
    }),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
    AuthModule
  ],
  controllers: [
    ClassroomServiceController,
    JitsiController,
    MaterialsController
  ],
  providers: [
    ClassroomServiceService,
    JitsiService,
    MaterialsService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [JitsiService, MaterialsService]
})
export class ClassroomServiceModule {}
