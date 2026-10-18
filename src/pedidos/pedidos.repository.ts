import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CriarPedidoDto } from './dto/criar-pedido.dto';
import { UnidadeMedida } from './enums/unidade-medida.enum';

const pedidoCompleto = {
  itensPedido: { include: { corte: true } },
  senha: true,
} satisfies Prisma.PedidoInclude;

export type PedidoComRelacoes = Prisma.PedidoGetPayload<{
  include: { itensPedido: { include: { corte: true } }; senha: true };
}>;

@Injectable()
export class PedidosRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarPorSessao(sessaoId: string) {
    return this.prisma.pedido.findUnique({
      where: { sessaoId },
      include: pedidoCompleto,
    });
  }

  async criar(dto: CriarPedidoDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.sessaoTotem.upsert({
        where: { id: dto.sessaoId },
        create: { id: dto.sessaoId },
        update: {},
      });

      const cortes = await tx.corte.findMany({
        where: {
          id: { in: dto.itens.map((item) => item.corteId) },
          disponivel: true,
        },
      });
      if (
        cortes.length !== new Set(dto.itens.map((item) => item.corteId)).size
      ) {
        return { indisponivel: true as const };
      }

      const cortesPorId = new Map(cortes.map((corte) => [corte.id, corte]));
      const itens = dto.itens.map((item) => {
        const corte = cortesPorId.get(item.corteId)!;
        const quantidade = new Prisma.Decimal(String(item.quantidade));
        const quantidadeKg =
          item.unidadeMedida === UnidadeMedida.GRAMA
            ? quantidade.div(1000)
            : quantidade;
        return {
          corteId: corte.id,
          quantidade,
          unidadeMedida: item.unidadeMedida,
          presencial: true,
          precoUnitarioKg: corte.precoKg,
          subtotal: corte.precoKg.mul(quantidadeKg),
        };
      });
      const total = itens.reduce(
        (acc, item) => acc.add(item.subtotal),
        new Prisma.Decimal(0),
      );

      const pedido = await tx.pedido.create({
        data: {
          sessaoId: dto.sessaoId,
          status: 'REGISTRADO',
          presencial: true,
          total,
          itensPedido: { create: itens },
          senha: {
            create: {
              status: 'PENDENTE',
              quantidadeChamadas: 0,
              numeroReemissoes: 0,
            },
          },
        },
        include: pedidoCompleto,
      });
      await tx.sessaoTotem.update({
        where: { id: dto.sessaoId },
        data: { pedidoConfirmado: true },
      });
      return pedido;
    });
  }
}
