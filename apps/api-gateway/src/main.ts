import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ApiGatewayModule } from './api-gateway.module';
import { EnvironmentValidationService } from '@app/shared';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde la raíz del monorepo
config({ path: resolve(__dirname, '../../../.env') });

async function bootstrap() {
  // Validar variables de entorno antes de iniciar la aplicación
  const envValidator = new EnvironmentValidationService();
  const envValidation = envValidator.validateEnvironment();
  
  if (!envValidation.isValid) {
    process.exit(1);
  }

  const config = envValidator.getConfig();
  
  const app = await NestFactory.create(ApiGatewayModule);
  
  // Configurar CORS
  app.enableCors({
    origin: config.app.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Configurar validación global
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // Configurar prefijo global
  app.setGlobalPrefix('api/v1');

  await app.listen(config.ports.apiGateway);

  const baseUrl = await app.getUrl();
  console.log(`🌐 API Gateway is running at ${baseUrl}`);
  console.log(`📝 Swagger documentation available at ${baseUrl}/api`);
}
bootstrap();
