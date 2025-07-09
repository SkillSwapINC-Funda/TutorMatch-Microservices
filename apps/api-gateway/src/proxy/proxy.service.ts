import { Injectable, Logger, BadGatewayException } from '@nestjs/common';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import { MICROSERVICES_CONFIG, getServiceForPath, removeServicePrefix } from '../config/microservices.config';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private proxyMiddlewares: Map<string, any> = new Map();

  constructor() {
    this.initializeProxies();
  }

  private initializeProxies() {
    MICROSERVICES_CONFIG.forEach(service => {
      const proxyOptions: Options = {
        target: service.url,
        changeOrigin: true,
        timeout: 10000,
        proxyTimeout: 10000,
        on: {
          error: (err, req, res) => {
            this.logger.error(`Proxy error for ${service.name}:`, err.message);
          },
          proxyReq: (proxyReq, req, res) => {
            this.logger.debug(`Proxying request to ${service.name}: ${req.method} ${req.url} -> ${proxyReq.path}`);

            // Preservar headers importantes
            if (req.headers.authorization) {
              proxyReq.setHeader('authorization', req.headers.authorization);
            }
            if (req.headers['content-type']) {
              proxyReq.setHeader('content-type', req.headers['content-type']);
            }

            const expressReq = req as Request;
            if (
              expressReq.body &&
              typeof expressReq.body === 'object' &&
              ['POST', 'PUT', 'PATCH'].includes((req.method || '').toUpperCase())
            ) {
              const bodyData = JSON.stringify(expressReq.body);
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          },
          proxyRes: (proxyRes, req, res) => {
            this.logger.debug(`Response from ${service.name}: ${proxyRes.statusCode}`);
            proxyRes.headers['Access-Control-Allow-Origin'] = '*';
            proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
          }
        }
      };

      const middleware = createProxyMiddleware(proxyOptions);
      this.proxyMiddlewares.set(service.prefix, middleware);

      this.logger.log(`Initialized proxy for ${service.name}: ${service.prefix} -> ${service.url}`);
    });
  }

  async proxyRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    const service = getServiceForPath(req.path);

    if (!service) {
      this.logger.warn(`No service found for path: ${req.path}`);
      return next();
    }

    const middleware = this.proxyMiddlewares.get(service.prefix);

    if (!middleware) {
      this.logger.error(`No proxy middleware found for service: ${service.name}`);
      throw new BadGatewayException(`Service ${service.name} not available`);
    }

    this.logger.debug(`Routing request to ${service.name}: ${req.method} ${req.path}`);

    middleware(req, res, next);
  }

  getAvailableServices() {
    return MICROSERVICES_CONFIG.map(service => ({
      name: service.name,
      prefix: service.prefix,
      description: service.description,
      status: 'configured'
    }));
  }

  async healthCheck(): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};

    for (const service of MICROSERVICES_CONFIG) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${service.url}${service.healthEndpoint}`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        results[service.name] = response.ok ? 'healthy' : 'unhealthy';
      } catch (error) {
        results[service.name] = 'unhealthy';
      }
    }

    return results;
  }
}