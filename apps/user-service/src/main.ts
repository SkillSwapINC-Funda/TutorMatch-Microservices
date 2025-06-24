// IMPORTANTE: Este import debe ser el PRIMERO para cargar variables de entorno
import '@app/shared/config/env-loader';

import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';

async function bootstrap() {
  console.log('=== USER SERVICE DEBUG ===');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'UNDEFINED');
  console.log('========================');

  const app = await NestFactory.create(UserServiceModule);
  
  // Configurar CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.USER_SERVICE_PORT || 3001;
  await app.listen(port);

  const baseUrl = await app.getUrl();
  console.log(`👤 User Service is running at ${baseUrl}`);
}
bootstrap();
