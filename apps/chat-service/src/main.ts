// IMPORTANTE: Este import debe ser el PRIMERO para cargar variables de entorno
import '@app/shared/config/env-loader';

import { NestFactory } from '@nestjs/core';
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
  
  // Configurar CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.CHAT_SERVICE_PORT || 3003;
  await app.listen(port);

  const baseUrl = await app.getUrl();
  console.log(`💬 Chat Service is running at ${baseUrl}`);
}
bootstrap();
