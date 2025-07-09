import { Controller, Get } from '@nestjs/common';
import { ClassroomServiceService } from './classroom-service.service';
import { Public } from '@app/shared';

@Controller('api/classroom')
export class ClassroomServiceController {
  constructor(private readonly classroomServiceService: ClassroomServiceService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.classroomServiceService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'classroom-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  @Public()
  @Get('materials')
  getMaterials() {
    return {
      message: 'Materials endpoint - use /materials/* for specific operations',
      availableEndpoints: [
        'GET /materials - List all materials',
        'POST /materials/upload - Upload new material',
        'GET /materials/:id - Get specific material',
        'PATCH /materials/:id - Update material',
        'DELETE /materials/:id - Delete material'
      ]
    };
  }
}
