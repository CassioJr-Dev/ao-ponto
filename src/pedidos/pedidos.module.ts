import { Module } from '@nestjs/common';
import { PedidosController } from './pedidos.controller';
import { PedidosRepository } from './pedidos.repository';
import { PedidosService } from './pedidos.service';

@Module({
  controllers: [PedidosController],
  providers: [PedidosRepository, PedidosService],
})
export class PedidosModule {}
