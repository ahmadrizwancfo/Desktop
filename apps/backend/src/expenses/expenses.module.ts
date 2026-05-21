import { Module, forwardRef } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CfoEngineModule } from '../cfo-engine/cfo-engine.module';

@Module({
    imports: [PrismaModule, forwardRef(() => CfoEngineModule)],
    controllers: [ExpensesController],
    providers: [ExpensesService],
    exports: [ExpensesService],
})
export class ExpensesModule { }
