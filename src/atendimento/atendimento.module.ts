import { Module } from '@nestjs/common';
import { AtendimentoController } from './atendimento.controller';
import { AtendimentoRepository } from './atendimento.repository';
import { AtendimentoService } from './atendimento.service';
import { LocalNetworkGuard } from './local-network.guard';

@Module({
  controllers: [AtendimentoController],
  providers: [AtendimentoRepository, AtendimentoService, LocalNetworkGuard],
})
export class AtendimentoModule {}
