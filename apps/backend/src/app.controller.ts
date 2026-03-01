import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipThrottle } from '@nestjs/throttler';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @SkipThrottle()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @SkipThrottle()
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('health/ready')
  @SkipThrottle()
  readinessCheck() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: 'connected', // TODO: Add actual DB health check
      }
    };
  }
}
