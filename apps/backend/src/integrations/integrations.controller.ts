import {
    Controller,
    Post,
    Get,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    BadRequestException,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { IntegrationsService } from './integrations.service';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZohoService } from './zoho.service';
import { QuickbooksService } from './quickbooks.service';
import { Request, Response } from 'express';
import { Req, Res, Query } from '@nestjs/common';

@Controller('integrations')
export class IntegrationsController {
    constructor(
        private readonly integrationsService: IntegrationsService,
        private readonly razorpayService: RazorpayService,
        private readonly zohoService: ZohoService,
        private readonly quickbooksService: QuickbooksService,
        private readonly prisma: PrismaService,
    ) { }

    @Get('connections')
    @UseGuards(JwtAuthGuard)
    async getConnections(@GetUser() user: any) {
        return this.prisma.integrationConnection.findMany({
            where: { organizationId: user.organizationId },
            select: {
                id: true,
                provider: true,
                status: true,
                lastSyncedAt: true,
            }
        });
    }

    @Post(':provider/disconnect')
    @UseGuards(JwtAuthGuard)
    async disconnect(@GetUser() user: any, @Req() req: Request) {
        // use Req path or parameter for provider explicitly
        const urlSplit = req.url.split('/');
        const provider = urlSplit[urlSplit.length - 2]; 
        
        await this.prisma.integrationConnection.deleteMany({
            where: { userId: user.id, provider: provider.toUpperCase() }
        });
        return { success: true };
    }

    @Post('razorpay/sync')
    @UseGuards(JwtAuthGuard)
    async syncRazorpay(
        @Body('keyId') keyId: string,
        @Body('keySecret') keySecret: string,
        @GetUser() user: any
    ) {
        return this.razorpayService.connectAndSync(keyId, keySecret, user.organizationId, user.id);
    }

    @Post('upload-csv')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }))
    async uploadCsv(
        @UploadedFile() file: Express.Multer.File,
        @Body('importType') importType: string,
        @GetUser() user: any
    ) {
        if (!file) {
            throw new BadRequestException('No CSV file uploaded');
        }

        const extension = file.originalname.split('.').pop()?.toLowerCase();
        if (extension !== 'csv') {
            throw new BadRequestException('Only CSV files are supported for raw integrations');
        }

        if (!importType || !['BANK_STATEMENT', 'REVENUE', 'EXPENSE'].includes(importType)) {
            throw new BadRequestException('Invalid import type. Expected BANK_STATEMENT, REVENUE, or EXPENSE');
        }

        return this.integrationsService.processCsvUpload(file, importType, user.organizationId, user.id);
    }

    // --- ZOHO BOOKS ENDPOINTS ---

    @Get('zoho/auth')
    @UseGuards(JwtAuthGuard)
    async zohoAuth(@GetUser() user: any, @Res() res: Response) {
        const url = this.zohoService.getAuthUrl(user.id);
        return res.redirect(url);
    }

    @Get('zoho/callback')
    async zohoCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
        if (code && state) {
            await this.zohoService.handleCallback(code, state);
        }
        // Redirect to frontend Integrations page
        return res.redirect('http://localhost:3000/integrations');
    }

    @Post('zoho/sync')
    @UseGuards(JwtAuthGuard)
    async zohoSync(@GetUser() user: any) {
        return this.zohoService.syncAccount(user.id);
    }

    // --- QUICKBOOKS ENDPOINTS ---

    @Get('quickbooks/auth')
    @UseGuards(JwtAuthGuard)
    async quickbooksAuth(@GetUser() user: any, @Res() res: Response) {
        const url = this.quickbooksService.getAuthUrl(user.id);
        return res.redirect(url);
    }

    @Get('quickbooks/callback')
    async quickbooksCallback(
        @Query('code') code: string, 
        @Query('state') state: string, 
        @Query('realmId') realmId: string, 
        @Res() res: Response
    ) {
        if (code && state) {
            await this.quickbooksService.handleCallback(code, realmId, state);
        }
        // Redirect to frontend Integrations page
        return res.redirect('http://localhost:3000/integrations');
    }

    @Post('quickbooks/sync')
    @UseGuards(JwtAuthGuard)
    async quickbooksSync(@GetUser() user: any) {
        return this.quickbooksService.syncAccount(user.id);
    }
}
