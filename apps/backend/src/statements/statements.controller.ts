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

        // Expanded file type support
        const allowedExtensions = [
            'csv', 'xlsx', 'xls', 'pdf', 'xml', // Documents
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'tif', 'bmp' // Images (scanned docs)
        ];
        const extension = file.originalname.split('.').pop()?.toLowerCase();

        if (!extension || !allowedExtensions.includes(extension)) {
            throw new BadRequestException(
                'Invalid file type. Supported formats: PDF, CSV, Excel, XML, or Image (JPG, PNG, TIFF) for scanned documents.'
            );
        }

        return this.statementsService.processUpload(file, user.organizationId, user.id);
    }
}

