import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

interface StandardErrorResponse {
    success: false;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    message: string | string[];
    error?: string;
    requestId: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Inject / resolve unique request ID
        const incomingRequestId =
            request.headers['x-request-id'] ||
            request.headers['x-correlation-id'] ||
            (request as any).requestId;
        const requestId =
            (Array.isArray(incomingRequestId) ? incomingRequestId[0] : incomingRequestId) || randomUUID();

        if (response.setHeader && typeof response.setHeader === 'function') {
            response.setHeader('X-Request-Id', requestId);
        }

        let status: number;
        let message: string | string[];
        let error: string | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const resp = exceptionResponse as Record<string, any>;
                message = resp.message || exception.message;
                error = resp.error;
            } else {
                message = exception.message;
            }
        } else if ((exception as any)?.code === 'P2002') {
            // Prisma Unique Constraint Violation
            status = HttpStatus.CONFLICT;
            message = 'This record or email already exists.';
            error = 'Conflict';
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = exception.name;

            this.logger.error(
                `[${requestId}] Unhandled exception: ${exception.message}`,
                exception.stack
            );
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected error occurred';
        }

        const errorResponse: StandardErrorResponse = {
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            error: error || undefined,
            requestId,
        };

        if (status >= 400) {
            const logLevel = status >= 500 ? 'error' : 'warn';
            this.logger[logLevel](`[${requestId}] ${status} ${request.method} ${request.url} - ${JSON.stringify(message)}`);
        }

        response.status(status).json(errorResponse);
    }
}
