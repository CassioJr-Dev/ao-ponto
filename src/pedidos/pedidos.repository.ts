import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CriarPedidoDto } from './dto/criar-pedido.dto';
import { UnidadeMedida } from './enums/unidade-medida.enum';
import { lockTicketSequence } from '../database/ticket-sequence-lock';

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
      await lockTicketSequence(tx);
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

  async reservarSenhas(totemId: string, reservaId: string, quantidade: number) {
    return this.prisma.$transaction(async (tx) => {
      await lockTicketSequence(tx);
      const existente = await tx.reservaSenha.findUnique({
        where: { id: reservaId },
      });
      if (existente) {
        if (existente.totemId !== totemId) return { conflito: true as const };
        return existente;
      }
      const cortes = await tx.corte.findMany({
        where: { disponivel: true },
        orderBy: { nome: 'asc' },
      });
      const sequence = await tx.$queryRaw<{ numero: number }[]>(Prisma.sql`
        SELECT nextval(pg_get_serial_sequence('"SenhaAtendimento"', 'numeroSequencial'))::int AS numero
      `);
      const numeroInicio = Number(sequence[0].numero);
      const numeroFim = numeroInicio + quantidade - 1;
      await tx.$queryRaw(Prisma.sql`
        SELECT setval(pg_get_serial_sequence('"SenhaAtendimento"', 'numeroSequencial'), ${numeroFim}, true)
      `);
      return tx.reservaSenha.create({
        data: {
          id: reservaId,
          totemId,
          numeroInicio,
          numeroFim,
          catalogo: cortes.map(
            ({ id, nome, imagemUrl, precoKg, disponivel }) => ({
              id,
              nome,
              imagemUrl,
              precoKg: precoKg.toString(),
              disponivel,
            }),
          ),
        },
      });
    });
  }

  async criarComSenhaReservada(
    dto: CriarPedidoDto,
    totemId: string,
    reservaId: string,
    numeroSequencial: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const reserva = await tx.reservaSenha.findUnique({
        where: { id: reservaId },
      });
      if (
        !reserva ||
        reserva.totemId !== totemId ||
        numeroSequencial < reserva.numeroInicio ||
        numeroSequencial > reserva.numeroFim
      ) {
        return { reservaInvalida: true as const };
      }
      const catalogo = reserva.catalogo as Array<{
        id: string;
        precoKg: string;
        disponivel: boolean;
      }>;
      const snapshots = new Map(catalogo.map((corte) => [corte.id, corte]));
      const ids = [...new Set(dto.itens.map(({ corteId }) => corteId))];
      const cortes = await tx.corte.findMany({ where: { id: { in: ids } } });
      if (cortes.length !== ids.length || ids.some((id) => !snapshots.has(id)))
        return { reservaInvalida: true as const };
      const cortesPorId = new Map(cortes.map((corte) => [corte.id, corte]));
      const itens = dto.itens.map((item) => {
        const corte = cortesPorId.get(item.corteId)!;
        const preco = new Prisma.Decimal(snapshots.get(item.corteId)!.precoKg);
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
          precoUnitarioKg: preco,
          subtotal: preco.mul(quantidadeKg),
        };
      });
      const total = itens.reduce(
        (acc, item) => acc.add(item.subtotal),
        new Prisma.Decimal(0),
      );
      await tx.sessaoTotem.upsert({
        where: { id: dto.sessaoId },
        create: { id: dto.sessaoId },
        update: {},
      });
      const pedido = await tx.pedido.create({
        data: {
          sessaoId: dto.sessaoId,
          status: 'REGISTRADO',
          presencial: true,
          total,
          itensPedido: { create: itens },
          senha: {
            create: {
              numeroSequencial,
              reservaSenhaId: reservaId,
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
