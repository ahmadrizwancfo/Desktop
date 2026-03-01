// Sentry configuration for Next.js - Server Side
// Only initializes if SENTRY_DSN is provided

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
    import('@sentry/nextjs').then((Sentry) => {
        Sentry.init({
            dsn,
            environment: process.env.NODE_ENV || 'development',
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        });
    }).catch(() => {
        console.log('Sentry not available');
    });
}

export { };
