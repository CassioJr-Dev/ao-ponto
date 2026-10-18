import { ApiProperty } from '@nestjs/swagger';
import { CorteResponseDto } from '../../cortes/dto/corte-response.dto';
import { UnidadeMedida } from '../enums/unidade-medida.enum';

export class ItemPedidoResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'b1c51953-a3b1-49d7-9b63-e27ec06c842d',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: 'c4e78d6f-0809-46a5-9679-5be35ff20a02',
  })
  pedidoId: string;

  @ApiProperty({
    format: 'uuid',
    example: 'e7b58a06-6ed8-4636-9fb2-8fe12856f72d',
  })
  corteId: string;

  @ApiProperty({ type: String, example: '0.750' })
  quantidade: string;

  @ApiProperty({
    enum: UnidadeMedida,
    enumName: 'UnidadeMedida',
    example: UnidadeMedida.KG,
  })
  unidadeMedida: UnidadeMedida;

  @ApiProperty({ example: true })
  presencial: boolean;

  @ApiProperty({ type: String, example: '59.90' })
  precoUnitarioKg: string;

  @ApiProperty({ type: String, example: '44.93' })
  subtotal: string;

  @ApiProperty({ type: () => CorteResponseDto })
  corte: CorteResponseDto;
}

export class SenhaAtendimentoResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'd9b35825-1505-4c38-b86e-31701f9ea553',
  })
  id: string;

  @ApiProperty({
    example: 42,
    description: 'Número sequencial exibido como senha.',
  })
  numeroSequencial: number;

  @ApiProperty({
    enum: ['PENDENTE', 'CHAMADA', 'FINALIZADA', 'EXPIRADA'],
    example: 'PENDENTE',
  })
  status: string;

  @ApiProperty({ example: 0 })
  quantidadeChamadas: number;

  @ApiProperty({ example: 0 })
  numeroReemissoes: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  ultimaChamada: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-15T18:30:00.000Z',
  })
  dataGeracao: string;
}

export class PedidoResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'c4e78d6f-0809-46a5-9679-5be35ff20a02',
  })
  id: string;

  @ApiProperty({ example: 101 })
  numeroPedido: number;

  @ApiProperty({
    format: 'uuid',
    example: '81fef0bf-943d-4fd8-8d74-2b2438155846',
  })
  sessaoId: string;

  @ApiProperty({
    enum: ['REGISTRADO', 'EM_PREPARO', 'CONCLUIDO'],
    example: 'REGISTRADO',
  })
  status: string;

  @ApiProperty({ example: true })
  presencial: boolean;

  @ApiProperty({ type: String, example: '44.93' })
  total: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-10-15T18:30:00.000Z',
  })
  dataCriacao: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  dataConclusao: string | null;

  @ApiProperty({ type: () => [ItemPedidoResponseDto] })
  itensPedido: ItemPedidoResponseDto[];

  @ApiProperty({ type: () => SenhaAtendimentoResponseDto })
  senha: SenhaAtendimentoResponseDto;
}
