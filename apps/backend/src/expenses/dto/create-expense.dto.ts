import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateExpenseDto {
    @IsNumber()
    amount: number;

    @IsString()
    category: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    vendor?: string;

    @IsDateString()
    date: string;

    @IsString()
    @IsOptional()
    status?: 'PENDING' | 'VERIFIED' | 'REJECTED';

    @IsBoolean()
    @IsOptional()
    tdsApplicable?: boolean;

    @IsNumber()
    @IsOptional()
    tdsAmount?: number;

    @IsNumber()
    @IsOptional()
    gstAmount?: number;

    @IsString()
    @IsOptional()
    receiptUrl?: string;

    @IsOptional()
    metadata?: any;
}
