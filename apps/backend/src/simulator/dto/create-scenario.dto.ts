import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateScenarioDto {
    @IsString()
    name: string;

    @IsNumber()
    headcount: number;

    @IsNumber()
    @IsOptional()
    avgSalary?: number;

    @IsNumber()
    saasSpend: number;

    @IsNumber()
    marketingSpend: number;

    @IsNumber()
    monthlyRevenue: number;

    @IsNumber()
    currentCash: number;
}
