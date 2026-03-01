import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry before importing anything else
export function initSentry() {
    const dsn = process.env.SENTRY_DSN;

    if (!dsn) {
        console.log('⚠️ Sentry DSN not configured - error tracking disabled');
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION || '1.0.0',

        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        // Profiling
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        integrations: [
            nodeProfilingIntegration(),
        ],

        // Filter sensitive data
        beforeSend(event) {
            // Remove sensitive headers
            if (event.request?.headers) {
                delete event.request.headers['authorization'];
                delete event.request.headers['cookie'];
            }

            // Remove sensitive data from request body
            if (event.request?.data) {
                const data = typeof event.request.data === 'string'
                    ? JSON.parse(event.request.data)
                    : event.request.data;

                if (data.password) data.password = '[REDACTED]';
                if (data.token) data.token = '[REDACTED]';
                if (data.apiKey) data.apiKey = '[REDACTED]';

                event.request.data = JSON.stringify(data);
            }

            return event;
        },

        // Ignore common non-critical errors
        ignoreErrors: [
            'UnauthorizedException',
            'NotFoundException',
            'BadRequestException',
        ],
    });

    console.log('✅ Sentry initialized for error tracking');
}

// Export Sentry for manual error capturing
export { Sentry };
