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
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
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
    async sync(@Param('id') id: string, @GetUser() user: any) {
        if (!user?.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        const account = await this.bankAccountsService.findOne(id);
        if (!account) {
            throw new NotFoundException('Bank account not found');
        }
        if (account.organizationId !== user.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        return this.bankSyncService.syncAccount(id);
    }


    @Post()
    @Roles(Role.ADMIN, Role.FOUNDER)
    create(@GetUser() user: any, @Body() createBankAccountDto: CreateBankAccountDto) {
        if (!user?.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        const organizationId = user.organizationId;
        const { organizationId: _, ...rest } = createBankAccountDto;
        return this.bankAccountsService.create({
            ...rest,
            organization: { connect: { id: organizationId } },
        });
    }

    @Get()
    findAll(@GetUser() user: any, @Query('organizationId') queryOrgId?: string) {
        if (!user?.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        if (queryOrgId && queryOrgId !== user.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        return this.bankAccountsService.findAll(user.organizationId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @GetUser() user: any) {
        if (!user?.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        const account = await this.bankAccountsService.findOne(id);
        if (!account) {
            throw new NotFoundException('Bank account not found');
        }
        if (account.organizationId !== user.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        return account;
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.FOUNDER)
    async update(
        @Param('id') id: string,
        @GetUser() user: any,
        @Body() updateBankAccountDto: UpdateBankAccountDto,
    ) {
        if (!user?.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        const account = await this.bankAccountsService.findOne(id);
        if (!account) {
            throw new NotFoundException('Bank account not found');
        }
        if (account.organizationId !== user.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        return this.bankAccountsService.update(id, updateBankAccountDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.FOUNDER)
    async remove(@Param('id') id: string, @GetUser() user: any) {
        if (!user?.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        const account = await this.bankAccountsService.findOne(id);
        if (!account) {
            throw new NotFoundException('Bank account not found');
        }
        if (account.organizationId !== user.organizationId) {
            throw new ForbiddenException('Cross-tenant access forbidden');
        }
        return this.bankAccountsService.remove(id);
    }
}

