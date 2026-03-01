import { Module } from '@nestjs/common';
import { UnitEconomicsController } from './unit-economics.controller';
import { UnitEconomicsService } from './unit-economics.service';

@Module({
    controllers: [UnitEconomicsController],
    providers: [UnitEconomicsService],
    exports: [UnitEconomicsService],
})
export class UnitEconomicsModule { }
