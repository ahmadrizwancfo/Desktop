import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const incomingId =
      req.headers['x-request-id'] ||
      req.headers['x-correlation-id'] ||
      req.headers['X-Request-Id'];

    const requestId = (Array.isArray(incomingId) ? incomingId[0] : incomingId) || randomUUID();

    // Attach request ID to request headers
    req.headers['x-request-id'] = requestId;
    req.headers['x-correlation-id'] = requestId;
    (req as any).requestId = requestId;

    // Set response headers
    if (res.setHeader && typeof res.setHeader === 'function') {
      res.setHeader('X-Request-Id', requestId);
      res.setHeader('x-correlation-id', requestId);
    }

    const startTime = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const { method, originalUrl } = req;
      const { statusCode } = res;
      this.logger.log(
        `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${durationMs}ms`
      );
    });

    next();
  }
}
