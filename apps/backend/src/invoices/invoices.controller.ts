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
import { InvoicesService } from './invoices.service';
import { PaymentReminderService } from './payment-reminder.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
    constructor(
        private readonly invoicesService: InvoicesService,
        private readonly paymentReminderService: PaymentReminderService,
    ) { }

    @Post()
    @Roles(Role.ADMIN, Role.FOUNDER, Role.ACCOUNTANT)
    create(@Body() createInvoiceDto: CreateInvoiceDto) {
        const { organizationId, customerId, vendorId, ...rest } = createInvoiceDto;
        return this.invoicesService.create({
            ...rest,
            organization: { connect: { id: organizationId } },
            ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
            ...(vendorId ? { vendor: { connect: { id: vendorId } } } : {}),
        });
    }

    @Get()
    findAll(@GetUser() user: any) {
        return this.invoicesService.findAll(user.organizationId);
    }

    @Get('reminders')
    getReminders(@GetUser() user: any) {
        return this.paymentReminderService.getInvoiceReminders(user.organizationId);
    }

    @Get('aging')
    getAging(@GetUser() user: any) {
        return this.paymentReminderService.getInvoiceAging(user.organizationId);
    }

    @Post(':id/send-reminder')
    @Roles(Role.ADMIN, Role.FOUNDER, Role.ACCOUNTANT)
    sendReminder(
        @Param('id') id: string,
        @Body() body: { channel: 'EMAIL' | 'WHATSAPP' | 'SMS' },
    ) {
        return this.paymentReminderService.sendReminder(id, body.channel);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.invoicesService.findOne(id);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.FOUNDER, Role.ACCOUNTANT)
    update(@Param('id') id: string, @Body() updateInvoiceDto: UpdateInvoiceDto) {
        return this.invoicesService.update(id, updateInvoiceDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.FOUNDER)
    remove(@Param('id') id: string) {
        return this.invoicesService.remove(id);
    }
}
