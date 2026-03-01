import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateOrganizationDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    industry?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(12)
    fiscalYearStartMonth?: number;
}
