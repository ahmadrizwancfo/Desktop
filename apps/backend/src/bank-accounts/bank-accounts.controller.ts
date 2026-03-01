import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

import { BankSyncService } from './bank-sync/bank-sync.service';

@Controller('bank-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BankAccountsController {
    constructor(
        private readonly bankAccountsService: BankAccountsService,
        private readonly bankSyncService: BankSyncService
    ) { }

    @Post(':id/sync')
    sync(@Param('id') id: string) {
        return this.bankSyncService.syncAccount(id);
    }


    @Post()
    @Roles(Role.ADMIN, Role.FOUNDER)
    create(@Body() createBankAccountDto: CreateBankAccountDto) {
        const { organizationId, ...rest } = createBankAccountDto;
        return this.bankAccountsService.create({
            ...rest,
            organization: { connect: { id: organizationId } },
        });
    }

    @Get()
    findAll(@Query('organizationId') organizationId: string) {
        return this.bankAccountsService.findAll(organizationId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.bankAccountsService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.FOUNDER)
    update(
        @Param('id') id: string,
        @Body() updateBankAccountDto: UpdateBankAccountDto,
    ) {
        return this.bankAccountsService.update(id, updateBankAccountDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id') id: string) {
        return this.bankAccountsService.remove(id);
    }
}

