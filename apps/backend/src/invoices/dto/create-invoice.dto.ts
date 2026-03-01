import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class CreateInvoiceDto {
    @IsString()
    @IsNotEmpty()
    invoiceNumber: string;

    @IsNumber()
    @IsNotEmpty()
    amount: number;

    @IsNumber()
    @IsOptional()
    tax?: number;

    @IsEnum(InvoiceStatus)
    @IsOptional()
    status?: InvoiceStatus;

    @IsDateString()
    @IsNotEmpty()
    dueDate: string;

    @IsString()
    @IsNotEmpty()
    organizationId: string;

    @IsString()
    @IsOptional()
    customerId?: string;

    @IsString()
    @IsOptional()
    vendorId?: string;
}
