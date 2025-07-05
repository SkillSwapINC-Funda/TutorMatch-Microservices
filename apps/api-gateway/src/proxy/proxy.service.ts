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
        pathRewrite: {
          [`^${service.prefix}`]: '', // Remueve el prefijo antes de enviar al microservicio
        },
        on: {
          error: (err, req, res) => {
            this.logger.error(`Proxy error for ${service.name}:`, err.message);
            // El error se maneja automáticamente por el proxy middleware
          },
          proxyReq: (proxyReq, req, res) => {
            this.logger.debug(`Proxying request to ${service.name}: ${req.method} ${req.url} -> ${proxyReq.path}`);
            
            // Preservar headers importantes
            if (req.headers.authorization) {
              proxyReq.setHeader('authorization', req.headers.authorization);
            }
            
            // Preservar content-type para uploads
            if (req.headers['content-type']) {
              proxyReq.setHeader('content-type', req.headers['content-type']);
            }
          },
          proxyRes: (proxyRes, req, res) => {
            this.logger.debug(`Response from ${service.name}: ${proxyRes.statusCode}`);
            
            // Permitir CORS
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
    
    // Ejecutar el middleware de proxy
    middleware(req, res, next);
  }

  getAvailableServices() {
    return MICROSERVICES_CONFIG.map(service => ({
      name: service.name,
      prefix: service.prefix,
      description: service.description,
      status: 'configured' // TODO: Implementar health checks
    }));
  }

  async healthCheck(): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};
    
    // TODO: Implementar ping a cada microservicio
    for (const service of MICROSERVICES_CONFIG) {
      try {
        // Aquí podrías hacer un ping real al health endpoint de cada servicio
        results[service.name] = 'healthy';
      } catch (error) {
        results[service.name] = 'unhealthy';
      }
    }
    
    return results;
  }
}
