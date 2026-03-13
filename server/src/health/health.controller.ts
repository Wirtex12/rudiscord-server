import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async health() {
    const dbConnected = await this.healthService.checkDatabase();

    return {
      status: 'ok',
      timestamp: new Date(),
      db_status: dbConnected ? 'connected' : 'disconnected',
    };
  }
}
