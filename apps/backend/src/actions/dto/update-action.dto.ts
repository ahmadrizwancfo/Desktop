import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ActionStatus } from '@prisma/client';

export class UpdateActionDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    assignee?: string;

    @IsEnum(ActionStatus)
    @IsOptional()
    status?: ActionStatus;

    @IsNumber()
    @IsOptional()
    expectedImpact?: number;

    @IsNumber()
    @IsOptional()
    actualImpact?: number;

    @IsDateString()
    @IsOptional()
    dueDate?: string;
}
