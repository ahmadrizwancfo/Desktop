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
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';


@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @Roles(Role.ADMIN, Role.FOUNDER)
    create(@GetUser() user: any, @Body() createOrganizationDto: CreateOrganizationDto) {
        return this.organizationsService.create({
            ...createOrganizationDto,
            users: { connect: { id: user.id } }
        });
    }


    @Get()
    findAll() {
        return this.organizationsService.findAll({});
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.organizationsService.findOne({ id });
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.FOUNDER)
    update(
        @Param('id') id: string,
        @Body() updateOrganizationDto: UpdateOrganizationDto,
    ) {
        return this.organizationsService.update({
            where: { id },
            data: updateOrganizationDto,
        });
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Param('id') id: string) {
        return this.organizationsService.remove({ id });
    }

    @Post(':id/users/:userId')
    @Roles(Role.ADMIN, Role.FOUNDER)
    addUser(@Param('id') id: string, @Param('userId') userId: string) {
        return this.organizationsService.addUserToOrganization(id, userId);
    }
}
