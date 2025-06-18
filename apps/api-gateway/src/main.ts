import { NestFactory } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(ApiGatewayModule);
  await app.listen(process.env.API_GATEWAY_PORT || 3000);

  const baseUrl = await app.getUrl();
  console.log(`🌐 API Gateway is running at ${baseUrl}`);
}
bootstrap();
