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

        // v4.1 TOUGH DATA: Validate Standard CSV Headers
        if (extension === 'csv') {
            const csvContent = file.buffer.toString();
            const firstLine = csvContent.split('\n')[0].toLowerCase();
            const requiredHeaders = ['date', 'description', 'amount', 'type'];
            const hasAllHeaders = requiredHeaders.every(h => firstLine.includes(h));

            if (!hasAllHeaders) {
                throw new BadRequestException(
                    'Invalid CSV format. Please use the FounderCFO Standard Template with headers: Date, Description, Amount, Type (IN/OUT).'
                );
            }
        }

        return this.statementsService.processUpload(file, user.organizationId, user.id);
    }
}

