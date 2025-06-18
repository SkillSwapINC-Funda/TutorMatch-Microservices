import { Controller, Get } from '@nestjs/common';
import { ClassroomServiceService } from './classroom-service.service';

@Controller()
export class ClassroomServiceController {
  constructor(private readonly classroomServiceService: ClassroomServiceService) {}

  @Get()
  getHello(): string {
    return this.classroomServiceService.getHello();
  }
}
