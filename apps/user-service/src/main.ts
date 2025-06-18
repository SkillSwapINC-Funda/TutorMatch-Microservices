import { NestFactory } from '@nestjs/core';
import { UserServiceModule } from './user-service.module';

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);
  await app.listen(process.env.USER_SERVICE_PORT || 3001);

  const baseUrl = await app.getUrl();
  console.log(`👤 User Service is running at ${baseUrl}`);
}
bootstrap();
