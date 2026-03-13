import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ CORS для всех (для тестов на Render)
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve static files for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // ✅ Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Слушать все интерфейсы (ВАЖНО для Render!)
  const host = process.env.HOST || '0.0.0.0';
  const port = process.env.PORT || 3000;

  await app.listen(port, host);
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🚀 Voxit Backend is running!');
  console.log(`📡 Host: ${host}`);
  console.log(`📡 Port: ${port}`);
  console.log(`🌐 URL: http://${host}:${port}`);
  console.log(`💚 Health: http://${host}:${port}/api/health`);
  console.log(`📁 Uploads: http://${host}:${port}/uploads/`);
  console.log('═══════════════════════════════════════════════════');
}

bootstrap();
