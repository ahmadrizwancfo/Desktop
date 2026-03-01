import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsEnum(TransactionType)
    @IsNotEmpty()
    type: TransactionType;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsDateString()
    @IsNotEmpty()
    date: string;

    @IsString()
    @IsNotEmpty()
    bankAccountId: string;

    @IsString()
    @IsOptional()
    invoiceId?: string;

    @IsOptional()
    metadata?: any;
}
