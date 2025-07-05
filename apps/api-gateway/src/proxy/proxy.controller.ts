import { Controller, All, Req, Res, Next, Get, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProxyService } from './proxy.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@app/shared';

@ApiTags('Proxy')
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  constructor(private readonly proxyService: ProxyService) {}

  @Public()
  @Get('/health')
  @ApiOperation({ summary: 'Health check for all microservices' })
  @ApiResponse({ status: 200, description: 'Health status of all services' })
  async getHealthStatus() {
    const services = await this.proxyService.healthCheck();
    return {
      gateway: 'healthy',
      timestamp: new Date().toISOString(),
      services
    };
  }

  @Public()
  @Get('/services')
  @ApiOperation({ summary: 'List available microservices' })
  @ApiResponse({ status: 200, description: 'List of available services' })
  getAvailableServices() {
    return {
      timestamp: new Date().toISOString(),
      services: this.proxyService.getAvailableServices()
    };
  }

  // Capturar todas las rutas que empiecen con /api/
  @All('/api/*')
  @ApiOperation({ summary: 'Proxy requests to microservices' })
  @ApiResponse({ status: 200, description: 'Request proxied to appropriate microservice' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 502, description: 'Service unavailable' })
  async proxyToMicroservice(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ): Promise<void> {
    try {
      await this.proxyService.proxyRequest(req, res, next);
    } catch (error) {
      this.logger.error('Proxy error:', error);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'Service temporarily unavailable',
          statusCode: 502
        });
      }
    }
  }
}
