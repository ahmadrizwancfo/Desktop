import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum StartupStage {
    IDEA = 'IDEA',
    PRE_SEED = 'PRE_SEED',
    SEED = 'SEED',
    GROWTH = 'GROWTH',
    SME = 'SME',
}

export enum PrimaryGoal {
    RAISE = 'RAISE',
    SURVIVE = 'SURVIVE',
    PROFIT = 'PROFIT',
    SCALE = 'SCALE',
}

export class CreateStartupProfileDto {
    @IsString()
    @IsNotEmpty()
    companyName: string;

    @IsEnum(StartupStage)
    stage: StartupStage;

    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    monthlyRevenue: number;

    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    monthlyExpenses: number;

    @IsNumber()
    @Min(0)
    @Transform(({ value }) => Number(value))
    cashInBank: number;

    @IsInt()
    @Min(1)
    @Transform(({ value }) => Number(value))
    teamSize: number;

    @IsString()
    @IsOptional()
    country?: string;

    @IsString()
    @IsNotEmpty()
    industry: string;

    @IsEnum(PrimaryGoal)
    primaryGoal: PrimaryGoal;

    @IsString()
    @IsOptional()
    organizationId?: string;

    @IsString()
    @IsOptional()
    decisionSensitivity?: string;

    @IsString()
    @IsOptional()
    notificationPreference?: string;
}
