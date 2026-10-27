import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CriarPedidoDto } from './dto/criar-pedido.dto';
import { PedidoComRelacoes, PedidosRepository } from './pedidos.repository';
import { SincronizarPedidoOfflineDto } from './dto/sincronizar-pedido-offline.dto';

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

  reservarSenhas(totemId: string, reservaId: string) {
    const quantidade = Number(process.env.OFFLINE_TICKET_BLOCK_SIZE ?? 50);
    return this.repository
      .reservarSenhas(totemId, reservaId, quantidade)
      .then((result) => {
        if ('conflito' in result)
          throw new ConflictException(
            'Este identificador de reserva jÃ¡ pertence a outro totem.',
          );
        return result;
      });
  }

  async sincronizar(dto: SincronizarPedidoOfflineDto) {
    const existente = await this.repository.buscarPorSessao(dto.sessaoId);
    if (existente) {
      const pedido = this.recuperarOuConflitar(existente, dto);
      if (
        pedido.senha?.numeroSequencial !== dto.numeroSequencial ||
        pedido.senha.reservaSenhaId !== dto.reservaId
      ) {
        throw new ConflictException(
          'A sessÃ£o jÃ¡ foi sincronizada com outra senha.',
        );
      }
      return pedido;
    }
    try {
      const result = await this.repository.criarComSenhaReservada(
        dto,
        dto.totemId,
        dto.reservaId,
        dto.numeroSequencial,
      );
      if ('reservaInvalida' in result)
        throw new ConflictException(
          'Reserva de senha invÃ¡lida ou fora do intervalo.',
        );
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const sameSession = await this.repository.buscarPorSessao(dto.sessaoId);
        if (sameSession) return this.sincronizar(dto);
        throw new ConflictException('Esta senha reservada jÃ¡ foi utilizada.');
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
