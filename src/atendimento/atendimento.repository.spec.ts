import { PrismaService } from '../database/prisma.service';
import { AtendimentoRepository } from './atendimento.repository';

describe('AtendimentoRepository', () => {
  it('concludes only the active ticket and leaves pending tickets for manual call', async () => {
    const activeTicket = {
      id: 'senha-atual',
      pedidoId: 'pedido-atual',
      status: 'CHAMADA',
    };
    const concludedTicket = { ...activeTicket, status: 'FINALIZADA' };
    const tx = {
      $queryRaw: jest.fn(),
      senhaAtendimento: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(activeTicket)
          .mockResolvedValueOnce(concludedTicket),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      pedido: { update: jest.fn() },
      chamadaSenha: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((operation) => operation(tx)),
    } as unknown as PrismaService;
    const repository = new AtendimentoRepository(prisma);

    await expect(repository.concluirPedido('pedido-atual')).resolves.toEqual({
      concluida: concludedTicket,
    });
    expect(tx.senhaAtendimento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'senha-atual' },
        data: { status: 'FINALIZADA' },
      }),
    );
    expect(tx.pedido.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pedido-atual' },
        data: expect.objectContaining({ status: 'CONCLUIDO' }),
      }),
    );
    expect(tx.senhaAtendimento.findMany).not.toHaveBeenCalled();
    expect(tx.chamadaSenha.create).not.toHaveBeenCalled();
  });

  it('does not complete a pending ticket', async () => {
    const tx = {
      $queryRaw: jest.fn(),
      senhaAtendimento: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'senha-pendente',
          pedidoId: 'pedido-pendente',
          status: 'PENDENTE',
        }),
        update: jest.fn(),
      },
      pedido: { update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((operation) => operation(tx)),
    } as unknown as PrismaService;
    const repository = new AtendimentoRepository(prisma);

    await expect(repository.concluirPedido('pedido-pendente')).resolves.toEqual(
      { naoEstaEmAtendimento: true },
    );
    expect(tx.senhaAtendimento.update).not.toHaveBeenCalled();
    expect(tx.pedido.update).not.toHaveBeenCalled();
  });
});
