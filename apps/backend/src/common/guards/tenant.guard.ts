import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';

/**
 * TenantGuard validates that the authenticated request carries a valid user and organizationId context.
 * NOTE: For high throughput, database ownership queries are NOT performed inside guards.
 * Service methods MUST enforce strict `organizationId` scoping in all SQL/Prisma operations.
 */
@Injectable()
export class TenantGuard implements CanActivate {
    private readonly logger = new Logger(TenantGuard.name);

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            this.logger.warn('TenantGuard: Unauthenticated request');
            throw new UnauthorizedException('Authentication required');
        }

        if (!user.organizationId) {
            this.logger.warn(`TenantGuard: User ${user.id} has no associated organizationId`);
            throw new ForbiddenException('Organization context missing. Please select or join an organization.');
        }

        // Attach organizationId to request for explicit access in controllers/services
        request.organizationId = user.organizationId;
        return true;
    }
}
