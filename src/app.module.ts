import { Module } from '@nestjs/common';
import { CortesModule } from './cortes/cortes.module';
import { DatabaseModule } from './database/database.module';
import { PedidosModule } from './pedidos/pedidos.module';

@Module({
  imports: [DatabaseModule, CortesModule, PedidosModule],
})
export class AppModule {}
