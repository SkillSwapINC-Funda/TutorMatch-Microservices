import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
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
  
  // Configurar CORS más permisivo para desarrollo
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
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

  // Configurar Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TutorMatch API Gateway')
    .setDescription('API Gateway para microservicios de TutorMatch')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development')
    .addTag('Gateway', 'Status y health checks del gateway')
    .addTag('Proxy', 'Enrutamiento a microservicios')
    .addTag('Auth', 'Autenticación centralizada')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger-ui', app, document);

  // No configurar prefijo global para permitir que el proxy maneje todas las rutas
  // app.setGlobalPrefix('api/v1');

  await app.listen(config.ports.apiGateway);

  const baseUrl = await app.getUrl();
  console.log(`🌐 API Gateway is running at ${baseUrl}`);
  console.log(`📋 Available services:`);
  console.log(`   • User Service: /api/users -> http://localhost:3001`);
  console.log(`   • Classroom Service: /api/classroom -> http://localhost:3002`);
  console.log(`   • Chat Service: /api/chat -> http://localhost:3003`);
  console.log(`📝 Swagger documentation available at ${baseUrl}/swagger-ui`);
}
bootstrap();
