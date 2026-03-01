import {
    Controller,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Body,
    BadRequestException,
    Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { OcrService } from './ocr.service';
import { DocumentAnalysisService } from './document-analysis.service';
import { DocumentImportService } from './document-import.service';

@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {
    constructor(
        private readonly ocrService: OcrService,
        private readonly documentAnalysisService: DocumentAnalysisService,
        private readonly documentImportService: DocumentImportService,
    ) { }

    /**
     * Extract text from an uploaded image or PDF
     */
    @Post('extract')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/tiff',
                'application/pdf',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
            }
        },
    }))
    async extractText(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.ocrService.extractTextFromBuffer(
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            success: true,
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            ...result,
        };
    }

    /**
     * Analyze a financial document with AI
     */
    @Post('analyze')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 20 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                // Images
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/tiff',
                'image/bmp',
                // Documents
                'application/pdf',
                // Spreadsheets
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
                'application/vnd.ms-excel', // xls
                'text/csv',
                'application/csv',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`Unsupported file type: ${file.mimetype}. Supported: PDF, Images, Excel, CSV.`), false);
            }
        },
    }))

    async analyzeDocument(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentAnalysisService.analyzeDocument(
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            filename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            ...result,
        };
    }

    /**
     * Analyze a bank statement and extract transactions
     */
    @Post('analyze/bank-statement')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    }))
    async analyzeBankStatement(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentAnalysisService.analyzeBankStatement(
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            filename: file.originalname,
            ...result,
        };
    }

    /**
     * Analyze an invoice and extract details
     */
    @Post('analyze/invoice')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    }))
    async analyzeInvoice(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentAnalysisService.analyzeInvoice(
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            filename: file.originalname,
            ...result,
        };
    }

    /**
     * Analyze a Balance Sheet
     */
    @Post('analyze/balance-sheet')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    }))
    async analyzeBalanceSheet(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentImportService.analyzeBalanceSheet(
            user.organizationId,
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            filename: file.originalname,
            documentType: 'BALANCE_SHEET',
            ...result,
        };
    }

    /**
     * Analyze a Profit & Loss Statement
     */
    @Post('analyze/profit-loss')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    }))
    async analyzeProfitAndLoss(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentImportService.analyzeProfitAndLoss(
            user.organizationId,
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            filename: file.originalname,
            documentType: 'PROFIT_AND_LOSS',
            ...result,
        };
    }

    /**
     * Import transactions from a bank statement into a bank account
     */
    @Post('import/bank-statement/:bankAccountId')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    }))
    async importBankStatement(
        @GetUser() user: any,
        @Param('bankAccountId') bankAccountId: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentImportService.importBankStatement(
            user.organizationId,
            bankAccountId,
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            filename: file.originalname,
            ...result,
        };
    }

    /**
     * Import an invoice from a document
     */
    @Post('import/invoice')
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
    }))
    async importInvoice(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentImportService.importInvoice(
            user.organizationId,
            file.buffer,
            file.mimetype,
            file.originalname,
        );

        return {
            filename: file.originalname,
            ...result,
        };
    }

    /**
     * Bulk analyze multiple documents
     */
    @Post('analyze/bulk')
    @UseInterceptors(FileInterceptor('files', {
        limits: { fileSize: 50 * 1024 * 1024, files: 10 },
    }))
    async analyzeBulk(
        @GetUser() user: any,
        @UploadedFile() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('No files uploaded');
        }

        const results = await Promise.all(
            files.map(file =>
                this.documentAnalysisService.analyzeDocument(
                    file.buffer,
                    file.mimetype,
                    file.originalname,
                ).then(result => ({
                    filename: file.originalname,
                    ...result,
                }))
            )
        );

        return {
            count: results.length,
            results,
        };
    }
}
