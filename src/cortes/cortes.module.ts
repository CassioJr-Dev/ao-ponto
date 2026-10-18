import { Module } from '@nestjs/common';
import { CortesController } from './cortes.controller';
import { CortesRepository } from './cortes.repository';
import { CortesService } from './cortes.service';

@Module({
  controllers: [CortesController],
  providers: [CortesRepository, CortesService],
})
export class CortesModule {}
