import { IsNumber, IsOptional } from 'class-validator';

export class CalculateDto {
    @IsNumber()
    @IsOptional()
    headcount?: number;

    @IsNumber()
    @IsOptional()
    avgSalary?: number;

    @IsNumber()
    @IsOptional()
    saasSpend?: number;

    @IsNumber()
    @IsOptional()
    marketingSpend?: number;

    @IsNumber()
    @IsOptional()
    otherExpenses?: number;

    @IsNumber()
    @IsOptional()
    monthlyRevenue?: number;

    @IsNumber()
    @IsOptional()
    currentCash?: number;
}
