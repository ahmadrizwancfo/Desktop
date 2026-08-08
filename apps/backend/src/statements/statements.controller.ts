import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { StatementsService } from './statements.service';

@Controller('statements')
@UseGuards(JwtAuthGuard)
export class StatementsController {
    constructor(private readonly statementsService: StatementsService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for large documents
    }))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @GetUser() user: any
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const allowedExtensions = ['csv', 'xlsx', 'xls'];
        const extension = file.originalname.split('.').pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension)) {
            throw new BadRequestException(
                'Invalid file type. Supported formats: CSV or Excel (.xlsx) for Alpha-10 compliance.'
            );
        }

        // Self-Healing Fuzzy CSV Header Normalization for Indian Bank Exports
        if (extension === 'csv') {
            const csvContent = file.buffer.toString();
            const firstLine = csvContent.split('\n')[0].toLowerCase();
            
            const dateHeaders = ['date', 'txn date', 'transaction date', 'value date', 'dt'];
            const descHeaders = ['description', 'narration', 'particulars', 'remarks', 'details', 'txn details'];
            const amountHeaders = ['amount', 'withdrawal', 'deposit', 'dr', 'cr', 'debit', 'credit', 'amt'];

            const hasDate = dateHeaders.some(h => firstLine.includes(h));
            const hasDesc = descHeaders.some(h => firstLine.includes(h));
            const hasAmount = amountHeaders.some(h => firstLine.includes(h));

            if (!hasDate || !hasDesc || !hasAmount) {
                throw new BadRequestException(
                    'Unrecognized CSV format. Upload a standard bank statement (HDFC, ICICI, Axis, SBI, Kotak) containing Date, Description/Narration, and Amount/Debit/Credit columns.'
                );
            }
        }

        return this.statementsService.processUpload(file, user.organizationId, user.id);
    }
}

