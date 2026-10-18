import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { UnidadeMedida } from './enums/unidade-medida.enum';
import { PedidosRepository } from './pedidos.repository';
import { PedidosService } from './pedidos.service';

const sessaoId = '81fef0bf-943d-4fd8-8d74-2b2438155846';
const corteId = 'e7b58a06-6ed8-4636-9fb2-8fe12856f72d';
const dto = {
  sessaoId,
  itens: [{ corteId, quantidade: 0.75, unidadeMedida: UnidadeMedida.KG }],
};

describe('PedidosService', () => {
  let service: PedidosService;
  let repository: { buscarPorSessao: jest.Mock; criar: jest.Mock };

  beforeEach(async () => {
    repository = {
      buscarPorSessao: jest.fn(),
      criar: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        PedidosService,
        { provide: PedidosRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(PedidosService);
  });

  it('creates the order when the session has none', async () => {
    const persisted = {
      id: 'pedido',
      sessaoId,
      itensPedido: [],
      senha: { numeroSequencial: 42 },
    };
    repository.criar.mockResolvedValue(persisted);

    await expect(service.criar(dto)).resolves.toEqual(persisted);
    expect(repository.criar).toHaveBeenCalledWith(dto);
  });

  it('recovers the persisted order for a repeated request', async () => {
    const persisted = {
      id: 'pedido',
      sessaoId,
      itensPedido: [
        {
          corteId,
          quantidade: new Prisma.Decimal('0.75'),
          unidadeMedida: 'KG',
        },
      ],
      senha: { numeroSequencial: 42 },
    };
    repository.buscarPorSessao.mockResolvedValue(persisted);

    await expect(service.criar(dto)).resolves.toEqual(persisted);
    expect(repository.criar).not.toHaveBeenCalled();
  });

  it('rejects a different order for a session that already has one', async () => {
    repository.buscarPorSessao.mockResolvedValue({
      id: 'pedido',
      sessaoId,
      itensPedido: [
        { corteId, quantidade: new Prisma.Decimal('1.5'), unidadeMedida: 'KG' },
      ],
      senha: { numeroSequencial: 42 },
    });

    await expect(service.criar(dto)).rejects.toBeInstanceOf(ConflictException);
  });
});
