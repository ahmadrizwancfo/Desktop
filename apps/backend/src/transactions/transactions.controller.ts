import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    @Roles(Role.ADMIN, Role.FOUNDER, Role.ACCOUNTANT)
    create(@Body() createTransactionDto: CreateTransactionDto) {
        const { bankAccountId, invoiceId, ...rest } = createTransactionDto;
        return this.transactionsService.create({
            ...rest,
            bankAccount: { connect: { id: bankAccountId } },
            ...(invoiceId ? { invoice: { connect: { id: invoiceId } } } : {}),
        });
    }

    @Get()
    findAll(
        @Query('bankAccountId') bankAccountId?: string,
        @Query('type') type?: string,
    ) {
        return this.transactionsService.findAll({
            where: {
                ...(bankAccountId ? { bankAccountId } : {}),
                ...(type ? { type: type as any } : {}),
            },
        });
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.transactionsService.findOne(id);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.FOUNDER)
    remove(@Param('id') id: string) {
        return this.transactionsService.remove(id);
    }
}

