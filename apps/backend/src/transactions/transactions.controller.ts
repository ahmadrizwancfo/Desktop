import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, TransactionType } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('transactions')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post()
    @Roles(Role.ADMIN, Role.FOUNDER, Role.ACCOUNTANT)
    create(@GetUser() user: any, @Body() createTransactionDto: CreateTransactionDto) {
        const { bankAccountId, invoiceId, ...rest } = createTransactionDto;
        return this.transactionsService.create(
            {
                ...rest,
                bankAccount: { connect: { id: bankAccountId } },
                ...(invoiceId ? { invoice: { connect: { id: invoiceId } } } : {}),
            },
            user.organizationId,
        );
    }

    @Get()
    findAll(
        @GetUser() user: any,
        @Query('bankAccountId') bankAccountId?: string,
        @Query('type') type?: string,
        @Query('take') take?: string,
        @Query('cursor') cursor?: string,
    ) {
        let validTransactionType: TransactionType | undefined;
        if (type) {
            const upper = type.toUpperCase();
            if (upper === 'CREDIT' || upper === 'INCOME') {
                validTransactionType = TransactionType.INCOME;
            } else if (upper === 'DEBIT' || upper === 'EXPENSE') {
                validTransactionType = TransactionType.EXPENSE;
            } else if (upper === 'TRANSFER') {
                validTransactionType = TransactionType.TRANSFER;
            } else {
                throw new BadRequestException('Invalid transaction type');
            }
        }

        const limit = take ? parseInt(take, 10) : 50;

        return this.transactionsService.findAll({
            take: limit,
            cursor,
            where: {
                bankAccount: { organizationId: user.organizationId },
                ...(bankAccountId ? { bankAccountId } : {}),
                ...(validTransactionType ? { type: validTransactionType } : {}),
            },
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @GetUser() user: any) {
        return this.transactionsService.findOne(id, user.organizationId);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.FOUNDER)
    async remove(@Param('id') id: string, @GetUser() user: any) {
        return this.transactionsService.remove(id, user.organizationId);
    }
}
