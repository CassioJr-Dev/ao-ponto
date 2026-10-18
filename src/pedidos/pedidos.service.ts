import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CriarPedidoDto } from './dto/criar-pedido.dto';
import { PedidoComRelacoes, PedidosRepository } from './pedidos.repository';

@Injectable()
export class PedidosService {
  constructor(private readonly repository: PedidosRepository) {}

  async criar(dto: CriarPedidoDto) {
    const existente = await this.repository.buscarPorSessao(dto.sessaoId);
    if (existente) return this.recuperarOuConflitar(existente, dto);

    try {
      const pedido = await this.repository.criar(dto);
      if ('indisponivel' in pedido) {
        throw new NotFoundException(
          'Um ou mais cortes não existem ou estão indisponíveis.',
        );
      }
      return pedido;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const pedidoConfirmado = await this.repository.buscarPorSessao(
          dto.sessaoId,
        );
        if (pedidoConfirmado)
          return this.recuperarOuConflitar(pedidoConfirmado, dto);
      }
      throw error;
    }
  }

  private recuperarOuConflitar(pedido: PedidoComRelacoes, dto: CriarPedidoDto) {
    const recebido = dto.itens
      .map((item) => `${item.corteId}:${item.quantidade}:${item.unidadeMedida}`)
      .sort();
    const salvo = pedido.itensPedido
      .map(
        (item) =>
          `${item.corteId}:${item.quantidade.toString()}:${item.unidadeMedida}`,
      )
      .sort();
    if (JSON.stringify(recebido) !== JSON.stringify(salvo)) {
      throw new ConflictException(
        'Esta sessão já possui um pedido confirmado diferente.',
      );
    }
    return pedido;
  }
}
