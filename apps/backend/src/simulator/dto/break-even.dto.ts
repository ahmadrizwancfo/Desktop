import { IsNumber } from 'class-validator';

export class BreakEvenDto {
    @IsNumber()
    fixedCosts: number;

    @IsNumber()
    avgRevenuePerUnit: number;

    @IsNumber()
    variableCostPerUnit: number;
}
