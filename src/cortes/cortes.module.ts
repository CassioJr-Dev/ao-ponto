import { Module } from '@nestjs/common';
import { CortesController } from './cortes.controller';
import { CortesRepository } from './cortes.repository';
import { CortesService } from './cortes.service';
import { PainelCortesController } from './painel-cortes.controller';

@Module({
  controllers: [CortesController, PainelCortesController],
  providers: [CortesRepository, CortesService],
})
export class CortesModule {}
