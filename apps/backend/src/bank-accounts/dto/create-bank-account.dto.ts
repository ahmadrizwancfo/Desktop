import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateBankAccountDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    accountNumber?: string;

    @IsString()
    @IsNotEmpty()
    bankName: string;

    @IsNumber()
    @IsOptional()
    balance?: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsString()
    @IsNotEmpty()
    organizationId: string;
}
