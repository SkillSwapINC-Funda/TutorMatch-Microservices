import { NestFactory } from '@nestjs/core';
import { ChatServiceModule } from './chat-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ChatServiceModule);
  await app.listen(process.env.CHAT_SERVICE_PORT || 3003);

  const baseUrl = await app.getUrl();
  console.log(`💬 Chat Service is running at ${baseUrl}`);
}
bootstrap();
