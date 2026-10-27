import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AtendimentoRepository } from './atendimento.repository';
import { AtendimentoService } from './atendimento.service';

describe('AtendimentoService', () => {
  let service: AtendimentoService;
  let repository: {
    listarFila: jest.Mock;
    obterPainel: jest.Mock;
    chamarProxima: jest.Mock;
    reemitirChamada: jest.Mock;
    concluirPedido: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      listarFila: jest.fn(),
      obterPainel: jest.fn(),
      chamarProxima: jest.fn(),
      reemitirChamada: jest.fn(),
      concluirPedido: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        AtendimentoService,
        { provide: AtendimentoRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(AtendimentoService);
  });

  it('returns the queue and panel data from the repository', async () => {
    const queue = { pendentes: [], emAtendimento: null, concluidos: [] };
    const panel = { senhaAtual: null, ultimasChamadas: [] };
    repository.listarFila.mockResolvedValue(queue);
    repository.obterPainel.mockResolvedValue(panel);

    await expect(service.listarFila()).resolves.toBe(queue);
    await expect(service.obterPainel()).resolves.toBe(panel);
  });

  it('rejects a second active call', async () => {
    repository.chamarProxima.mockResolvedValue({ jaExisteChamada: true });

    await expect(service.chamarProxima()).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('translates invalid reissue and completion requests', async () => {
    repository.reemitirChamada.mockResolvedValue({ naoEncontrada: true });
    await expect(service.reemitirChamada('pedido')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    repository.concluirPedido.mockResolvedValue({
      naoEstaEmAtendimento: true,
    });
    await expect(service.concluirPedido('pedido')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
