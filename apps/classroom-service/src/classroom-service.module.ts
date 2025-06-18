import { Module } from '@nestjs/common';
import { ClassroomServiceController } from './classroom-service.controller';
import { ClassroomServiceService } from './classroom-service.service';

@Module({
  imports: [],
  controllers: [ClassroomServiceController],
  providers: [ClassroomServiceService],
})
export class ClassroomServiceModule {}
