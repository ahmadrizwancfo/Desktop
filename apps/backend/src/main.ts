import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Try to initialize Sentry, but don't fail if it's not configured
try {
  const { initSentry } = require('./common/sentry');
  initSentry();
} catch (error) {
  console.log('⚠️ Sentry not initialized (optional)');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const logger = new Logger('Bootstrap');

  // Security: Helmet middleware for setting HTTP headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    } : false, // Disable CSP in development for easier debugging
    crossOriginEmbedderPolicy: false,
  }));

  // Performance: Gzip compression
  app.use(compression());

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validation: Strip unknown properties and transform payloads
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  // CORS: Read allowed origins from env (supports comma-separated list for multi-origin)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3005'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global prefix for API (except health checks and OAuth)
  app.setGlobalPrefix('api', {
    exclude: ['/', 'health', 'health/ready', 'auth/google', 'auth/google/callback'],
  });

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');

  logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  logger.log(`🚀 FounderCFO API running on port ${port}`);
  logger.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 Security: Helmet ✓ | Rate Limiting ✓ | CORS ✓`);
  logger.log(`📊 Health check: http://localhost:${port}/health`);
  logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

bootstrap();
