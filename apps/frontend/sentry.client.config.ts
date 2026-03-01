// Sentry configuration for Next.js - Client Side
// Only initializes if SENTRY_DSN is provided

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only import and initialize Sentry if DSN is configured
if (dsn) {
    import('@sentry/nextjs').then((Sentry) => {
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            ignoreErrors: [
                'ResizeObserver loop limit exceeded',
                'ResizeObserver loop completed with undelivered notifications',
                'Non-Error promise rejection captured',
            ],
        });
    }).catch(() => {
        console.log('Sentry not available');
    });
}

export { };
