import { Module } from '@nestjs/common';
import { CortesModule } from './cortes/cortes.module';
import { DatabaseModule } from './database/database.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { AtendimentoModule } from './atendimento/atendimento.module';

@Module({
  imports: [DatabaseModule, CortesModule, PedidosModule, AtendimentoModule],
})
export class AppModule {}
