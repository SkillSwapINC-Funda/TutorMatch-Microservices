// IMPORTANTE: Este import debe ser el PRIMERO para cargar variables de entorno
import '@app/shared/config/env-loader';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ChatServiceModule } from './chat-service.module';

async function bootstrap() {
  console.log('=== CHAT SERVICE DEBUG ===');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'UNDEFINED');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'UNDEFINED');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'UNDEFINED');
  console.log('========================');

  // Verificar variables críticas
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    process.exit(1);
  }

  const app = await NestFactory.create(ChatServiceModule);
  
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
    .setTitle('Chat Service API')
    .setDescription('API para el servicio de chat en tiempo real de TutorMatch')
    .setVersion('1.0')
    .addTag('chat', 'Operaciones relacionadas con el chat')
    .addTag('rooms', 'Gestión de salas de chat')
    .addTag('messages', 'Gestión de mensajes')
    .addTag('realtime', 'Funcionalidades en tiempo real')
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
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.CHAT_SERVICE_PORT || 3003;
  await app.listen(port, '0.0.0.0');

  const baseUrl = `http://localhost:${port}`;
  console.log(`💬 Chat Service is running at ${baseUrl}`);
  console.log(`📚 Swagger documentation available at ${baseUrl}/api/docs`);
}
bootstrap();
