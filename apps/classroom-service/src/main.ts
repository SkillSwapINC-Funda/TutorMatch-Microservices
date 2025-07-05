// IMPORTANTE: Este import debe ser el PRIMERO para cargar variables de entorno
import '@app/shared/config/env-loader';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ClassroomServiceModule } from './classroom-service.module';

async function bootstrap() {
  // Verificar variables críticas
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    process.exit(1);
  }

  const app = await NestFactory.create(ClassroomServiceModule);
  
  // Configurar validación global
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // Configurar CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('Classroom Service API')
    .setDescription('API para el servicio de aulas virtuales y videollamadas de TutorMatch')
    .setVersion('1.0')
    .addTag('classroom', 'Operaciones relacionadas con aulas')
    .addTag('video-calls', 'Gestión de videollamadas con Jitsi Meet')
    .addTag('sessions', 'Gestión de sesiones de tutoría')
    .addTag('materials', 'Gestión de materiales educativos')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Token JWT para autenticación',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger-ui', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.CLASSROOM_SERVICE_PORT || 3002;
  await app.listen(port, '0.0.0.0');

  const baseUrl = `http://localhost:${port}`;
  console.log(`🏫 Classroom Service is running at ${baseUrl}`);
  console.log(`📚 Swagger documentation available at ${baseUrl}/swagger-ui`);
}
bootstrap();
