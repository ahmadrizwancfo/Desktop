import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    message: string | string[];
    error?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

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
            // Handle Prisma Unique Constraint Violation
            status = HttpStatus.CONFLICT;
            message = 'This email or record already exists.';
            error = 'Conflict';
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = exception.name;

            // Log the full error for debugging (but don't expose to client)
            this.logger.error(
                `Unhandled exception: ${exception.message}`,
                exception.stack
            );
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected error occurred';
        }

        const errorResponse: ErrorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
        };

        if (error) {
            errorResponse.error = error;
        }

        // Log 4xx and 5xx errors
        if (status >= 400) {
            const logLevel = status >= 500 ? 'error' : 'warn';
            this.logger[logLevel](
                `${request.method} ${request.url} - ${status}`,
                typeof message === 'string' ? message : JSON.stringify(message)
            );
        }

        response.status(status).json(errorResponse);
    }
}
