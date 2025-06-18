import { NestFactory } from '@nestjs/core';
import { ClassroomServiceModule } from './classroom-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ClassroomServiceModule);
  await app.listen(process.env.CLASSROOM_SERVICE_PORT || 3002);

  const baseUrl = await app.getUrl();
  console.log(`🏫 Classroom Service is running at ${baseUrl}`);
}
bootstrap();
