import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) { }

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
  async readinessCheck() {
    const isDbConnected = await this.prisma.ping();
    return {
      status: isDbConnected ? 'ready' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        api: 'healthy',
        database: isDbConnected ? 'connected' : 'disconnected',
      }
    };
  }
}
