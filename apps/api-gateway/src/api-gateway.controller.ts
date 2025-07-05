import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';
import { Public } from '@app/shared';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Gateway')
@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Welcome message' })
  @ApiResponse({ status: 200, description: 'Returns welcome message' })
  getHello(): string {
    return this.apiGatewayService.getHello();
  }

  @Public()
  @Get('/status')
  @ApiOperation({ summary: 'Gateway status information' })
  @ApiResponse({ status: 200, description: 'Returns gateway status and info' })
  getStatus() {
    return {
      name: 'TutorMatch API Gateway',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      description: 'Proxy gateway for TutorMatch microservices',
      routes: [
        { prefix: '/api/users', service: 'user-service', port: 3001 },
        { prefix: '/api/classroom', service: 'classroom-service', port: 3002 },
        { prefix: '/api/chat', service: 'chat-service', port: 3003 }
      ]
    };
  }
}
