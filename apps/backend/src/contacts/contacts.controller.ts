import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ContactsService, CreateContactDto } from './contacts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Post()
    create(@GetUser('organizationId') organizationId: string, @Body() dto: CreateContactDto) {
        return this.contactsService.create(organizationId, dto);
    }

    @Get()
    findAll(@GetUser('organizationId') organizationId: string) {
        return this.contactsService.findAll(organizationId);
    }

    @Get(':id')
    findOne(@GetUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.contactsService.findOne(organizationId, id);
    }
}
