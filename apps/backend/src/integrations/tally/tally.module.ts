import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TallyClient } from './tally-client';
import { TallyTransformerService } from './tally-transformer.service';
import { TallyConnectorService } from './tally-connector.service';
import { TallyController } from './tally.controller';

import { CategoryNormalizationService } from '../../common/canonical-model/category-normalization.service';

@Module({
  imports: [PrismaModule],
  controllers: [TallyController],
  providers: [TallyClient, TallyTransformerService, TallyConnectorService, CategoryNormalizationService],
  exports: [TallyConnectorService, TallyTransformerService, CategoryNormalizationService],
})
export class TallyModule {}
