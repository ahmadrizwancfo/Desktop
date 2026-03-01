import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateActionDto {
    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    assignee?: string; // FOUNDER, OPS, ACCOUNTANT

    @IsNumber()
    @IsOptional()
    expectedImpact?: number;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsString()
    @IsOptional()
    sourceInsight?: string;

    @IsString()
    @IsOptional()
    sourceMetric?: string;
}
