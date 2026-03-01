import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    findAll(
        @Request() req,
        @Query('skip') skip?: string,
        @Query('take') take?: string,
        @Query('isRead') isRead?: string,
    ) {
        return this.notificationsService.findAllForUser(req.user.id, {
            skip: skip ? parseInt(skip, 10) : undefined,
            take: take ? parseInt(take, 10) : undefined,
            isRead: isRead !== undefined ? isRead === 'true' : undefined,
        });
    }

    @Get('unread-count')
    getUnreadCount(@Request() req) {
        return this.notificationsService.getUnreadCount(req.user.id);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        return this.notificationsService.markAsRead(id);
    }

    @Post('read-all')
    markAllAsRead(@Request() req) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.notificationsService.delete(id);
    }
}
