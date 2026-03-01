import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    @Post()
    create(@GetUser() user: any, @Body() dto: CreateExpenseDto) {
        return this.expensesService.create(user.organizationId, dto);
    }

    @Get()
    findAll(@GetUser() user: any) {
        return this.expensesService.findAll(user.organizationId);
    }

    @Get('stats')
    getStats(@GetUser() user: any) {
        return this.expensesService.getStats(user.organizationId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.expensesService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateExpenseDto) {
        return this.expensesService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.expensesService.remove(id);
    }
}
