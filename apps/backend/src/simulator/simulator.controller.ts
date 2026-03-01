import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { SimulatorService } from './simulator.service';
import { CalculateDto } from './dto/calculate.dto';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { BreakEvenDto } from './dto/break-even.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('simulator')
@UseGuards(JwtAuthGuard)
export class SimulatorController {
    constructor(private readonly simulatorService: SimulatorService) { }

    /**
     * Calculate runway based on input variables (real-time, not saved)
     */
    @Post('calculate')
    calculate(@Body() dto: CalculateDto) {
        return this.simulatorService.calculate(dto);
    }

    /**
     * Calculate Break-Even Point
     */
    @Post('break-even')
    calculateBreakEven(@Body() dto: BreakEvenDto) {
        return this.simulatorService.calculateBreakEven(
            dto.fixedCosts,
            dto.avgRevenuePerUnit,
            dto.variableCostPerUnit
        );
    }

    /**
     * Get baseline values from existing financial data
     */
    @Get('baseline')
    getBaseline(@GetUser() user: any) {
        return this.simulatorService.getBaseline(user.organizationId);
    }

    /**
     * Save a scenario
     */
    @Post('scenarios')
    createScenario(@GetUser() user: any, @Body() dto: CreateScenarioDto) {
        return this.simulatorService.createScenario(user.organizationId, dto);
    }

    /**
     * Get all saved scenarios
     */
    @Get('scenarios')
    getScenarios(@GetUser() user: any) {
        return this.simulatorService.getScenarios(user.organizationId);
    }

    /**
     * Get a specific scenario
     */
    @Get('scenarios/:id')
    getScenario(@Param('id') id: string) {
        return this.simulatorService.getScenario(id);
    }

    /**
     * Delete a scenario
     */
    @Delete('scenarios/:id')
    deleteScenario(@Param('id') id: string) {
        return this.simulatorService.deleteScenario(id);
    }

    /**
     * Compare multiple scenarios
     */
    @Post('compare')
    compareScenarios(@Body() body: { scenarioIds: string[] }) {
        return this.simulatorService.compareScenarios(body.scenarioIds);
    }
}
