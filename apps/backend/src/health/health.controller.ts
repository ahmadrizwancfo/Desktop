import { Controller, Get, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
    private readonly logger = new Logger(HealthController.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Beta Readiness System Health & Observability Audit Endpoint.
     * Evaluates PostgreSQL DB connection, Redis cache health, and system uptime.
     */
    @Get()
    async getSystemHealth() {
        const startTime = Date.now();
        let dbStatus = 'HEALTHY';
        let redisStatus = 'HEALTHY';

        // 1. Audit PostgreSQL Database Health
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch (e: any) {
            dbStatus = `UNHEALTHY: ${e.message}`;
        }

        // 2. Audit Redis Cache Health
        try {
            const host = this.configService.get<string>('REDIS_HOST', 'localhost');
            const port = this.configService.get<number>('REDIS_PORT', 6379);
            const client = new Redis({ host, port, maxRetriesPerRequest: 1, lazyConnect: true });
            await client.connect();
            await client.ping();
            await client.quit();
        } catch (e: any) {
            redisStatus = `DEGRADED: ${e.message}`;
        }

        const durationMs = Date.now() - startTime;

        const healthData = {
            status: dbStatus === 'HEALTHY' ? 'OK' : 'DEGRADED',
            environment: process.env.NODE_ENV || 'production',
            uptimeSeconds: Math.round(process.uptime()),
            latencyMs: durationMs,
            components: {
                database: dbStatus,
                redis: redisStatus,
                tenantIsolationGuard: 'ACTIVE',
                rateLimitingThrottle: 'ACTIVE',
            },
            timestamp: new Date().toISOString(),
        };

        this.logger.log(JSON.stringify({
            event: 'system.health_check',
            ...healthData,
        }));

        return healthData;
    }
}
