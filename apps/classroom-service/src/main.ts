// IMPORTANTE: Este import debe ser el PRIMERO para cargar variables de entorno
import '@app/shared/config/env-loader';

import { NestFactory } from '@nestjs/core';
import { ClassroomServiceModule } from './classroom-service.module';

async function bootstrap() {
  console.log('=== CLASSROOM SERVICE DEBUG ===');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'UNDEFINED');
  console.log('===============================');

  const app = await NestFactory.create(ClassroomServiceModule);
  
  // Configurar CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.CLASSROOM_SERVICE_PORT || 3002;
  await app.listen(port);

  const baseUrl = await app.getUrl();
  console.log(`🏫 Classroom Service is running at ${baseUrl}`);
}
bootstrap();
