import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ActionsService } from './actions.service';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ActionStatus } from '@prisma/client';

@Controller('actions')
@UseGuards(JwtAuthGuard)
export class ActionsController {
    constructor(private readonly actionsService: ActionsService) { }

    /**
     * Create a new action
     */
    @Post()
    create(@GetUser() user: any, @Body() dto: CreateActionDto) {
        return this.actionsService.create(user.organizationId, dto);
    }

    /**
     * Get all actions, optionally filtered by status
     */
    @Get()
    findAll(@GetUser() user: any, @Query('status') status?: ActionStatus) {
        return this.actionsService.findAll(user.organizationId, status);
    }

    /**
     * Get action stats (impact score, completion rate, etc.)
     */
    @Get('stats')
    getStats(@GetUser() user: any) {
        return this.actionsService.getStats(user.organizationId);
    }

    /**
     * Get overdue actions
     */
    @Get('overdue')
    getOverdue(@GetUser() user: any) {
        return this.actionsService.getOverdue(user.organizationId);
    }

    /**
     * Get a single action
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.actionsService.findOne(id);
    }

    /**
     * Update an action (status, assignee, actual impact, etc.)
     */
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateActionDto) {
        return this.actionsService.update(id, dto);
    }

    /**
     * Delete an action
     */
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.actionsService.remove(id);
    }
}
