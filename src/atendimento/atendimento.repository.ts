import { Injectable } from '@nestjs/common';
import { Prisma, StatusSenha } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const ticketDetalhado = {
  pedido: {
    include: {
      itensPedido: { include: { corte: true } },
    },
  },
} satisfies Prisma.SenhaAtendimentoInclude;

type TicketDetalhado = Prisma.SenhaAtendimentoGetPayload<{
  include: typeof ticketDetalhado;
}>;

@Injectable()
export class AtendimentoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarFila() {
    const [pendentes, emAtendimento, concluidos] = await Promise.all([
      this.prisma.senhaAtendimento.findMany({
        where: { status: StatusSenha.PENDENTE },
        include: ticketDetalhado,
      }),
      this.prisma.senhaAtendimento.findFirst({
        where: { status: StatusSenha.CHAMADA },
        include: ticketDetalhado,
      }),
      this.prisma.senhaAtendimento.findMany({
        where: { status: StatusSenha.FINALIZADA },
        include: ticketDetalhado,
        orderBy: { dataGeracao: 'desc' },
        take: 20,
      }),
    ]);

    return {
      pendentes: this.ordenarFila(pendentes),
      emAtendimento,
      concluidos,
    };
  }

  async obterPainel() {
    const [senhaAtual, chamadas] = await Promise.all([
      this.prisma.senhaAtendimento.findFirst({
        where: { status: StatusSenha.CHAMADA },
        include: ticketDetalhado,
      }),
      this.prisma.chamadaSenha.findMany({
        include: { senha: { include: ticketDetalhado } },
        orderBy: { dataChamada: 'desc' },
        take: 5,
      }),
    ]);
    return { senhaAtual, ultimasChamadas: chamadas };
  }

  chamarProxima() {
    return this.prisma.$transaction(async (tx) => {
      await this.adquirirBloqueioFila(tx);
      const atual = await tx.senhaAtendimento.findFirst({
        where: { status: StatusSenha.CHAMADA },
      });
      if (atual) return { jaExisteChamada: true as const };

      const pendentes = await tx.senhaAtendimento.findMany({
        where: { status: StatusSenha.PENDENTE },
        include: ticketDetalhado,
      });
      const proxima = this.ordenarFila(pendentes)[0];
      if (!proxima) return { senha: null };
      return { senha: await this.registrarChamada(tx, proxima, false) };
    });
  }

  reemitirChamada(pedidoId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.adquirirBloqueioFila(tx);
      const senha = await tx.senhaAtendimento.findUnique({
        where: { pedidoId },
        include: ticketDetalhado,
      });
      if (!senha) return { naoEncontrada: true as const };
      if (senha.status !== StatusSenha.CHAMADA)
        return { naoEstaEmAtendimento: true as const };
      return { senha: await this.registrarChamada(tx, senha, true) };
    });
  }

  concluirPedido(pedidoId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.adquirirBloqueioFila(tx);
      const senha = await tx.senhaAtendimento.findUnique({
        where: { pedidoId },
        include: ticketDetalhado,
      });
      if (!senha) return { naoEncontrada: true as const };
      if (senha.status !== StatusSenha.CHAMADA)
        return { naoEstaEmAtendimento: true as const };

      await tx.senhaAtendimento.update({
        where: { id: senha.id },
        data: { status: StatusSenha.FINALIZADA },
      });
      await tx.pedido.update({
        where: { id: pedidoId },
        data: { status: 'CONCLUIDO', dataConclusao: new Date() },
      });

      return {
        concluida: await tx.senhaAtendimento.findUnique({
          where: { id: senha.id },
          include: ticketDetalhado,
        }),
      };
    });
  }

  private ordenarFila<T extends TicketDetalhado>(tickets: T[]): T[] {
    const pedidosPorCorte = new Map<string, Set<string>>();
    for (const ticket of tickets) {
      for (const corteId of new Set(
        ticket.pedido.itensPedido.map((item) => item.corteId),
      )) {
        const pedidos = pedidosPorCorte.get(corteId) ?? new Set<string>();
        pedidos.add(ticket.pedidoId);
        pedidosPorCorte.set(corteId, pedidos);
      }
    }

    const pontuacao = (ticket: T) =>
      Math.max(
        0,
        ...Array.from(
          new Set(ticket.pedido.itensPedido.map((item) => item.corteId)),
          (corteId) => pedidosPorCorte.get(corteId)?.size ?? 0,
        ),
      );

    return [...tickets].sort((a, b) => {
      return (
        pontuacao(b) - pontuacao(a) ||
        a.pedido.dataCriacao.getTime() - b.pedido.dataCriacao.getTime()
      );
    });
  }

  private async adquirirBloqueioFila(tx: Prisma.TransactionClient) {
    await tx.$queryRaw<{ locked: boolean }[]>(
      Prisma.sql`SELECT pg_advisory_xact_lock(718204, 1) IS NULL AS locked`,
    );
  }

  private async registrarChamada(
    tx: Prisma.TransactionClient,
    senha: TicketDetalhado,
    reemissao: boolean,
  ) {
    const dataChamada = new Date();
    const atualizada = await tx.senhaAtendimento.update({
      where: { id: senha.id },
      data: {
        status: StatusSenha.CHAMADA,
        quantidadeChamadas: { increment: 1 },
        ...(reemissao ? { numeroReemissoes: { increment: 1 } } : {}),
        ultimaChamada: dataChamada,
      },
    });
    await tx.pedido.update({
      where: { id: senha.pedidoId },
      data: { status: 'EM_PREPARO' },
    });
    await tx.chamadaSenha.create({
      data: { senhaId: senha.id, dataChamada, reemissao },
    });
    return tx.senhaAtendimento.findUniqueOrThrow({
      where: { id: atualizada.id },
      include: ticketDetalhado,
    });
  }
}
