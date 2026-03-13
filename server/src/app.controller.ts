import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('version')
  getVersion() {
    return {
      version: '1.0.0',
      name: 'Voxit Backend',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get()
  getHello() {
    return {
      message: 'Welcome to Voxit API!',
      docs: '/api/health',
      version: '/api/version',
    };
  }
}
