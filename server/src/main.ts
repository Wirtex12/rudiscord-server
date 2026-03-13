import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ✅ CORS для всех
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // ✅ Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // ✅ Прикрепи Socket.io адаптер (ВАЖНО!)
  app.useWebSocketAdapter(new IoAdapter(app));
  
  // ✅ Слушать все интерфейсы
  const host = process.env.HOST || '0.0.0.0';
  const port = parseInt(process.env.PORT || '3000', 10);
  
  await app.listen(port, host);
  console.log(`🚀 Backend running on: http://${host}:${port}`);
  console.log(`📡 Health: http://${host}:${port}/api/health`);
  console.log(`🔗 WebSocket: ws(s)://${host}:${port}/socket.io/`);
}

bootstrap();