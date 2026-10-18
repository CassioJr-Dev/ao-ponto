import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ItemPedidoDto } from './item-pedido.dto';

export class CriarPedidoDto {
  @ApiProperty({
    description:
      'UUID que identifica a sessão ativa do totem. Também é a chave de idempotência do pedido.',
    format: 'uuid',
    example: '81fef0bf-943d-4fd8-8d74-2b2438155846',
  })
  @IsUUID()
  sessaoId: string;

  @ApiProperty({
    description: 'Itens selecionados. Deve conter pelo menos um item.',
    type: () => [ItemPedidoDto],
    minItems: 1,
    example: [
      {
        corteId: 'e7b58a06-6ed8-4636-9fb2-8fe12856f72d',
        quantidade: 0.75,
        unidadeMedida: 'KG',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens: ItemPedidoDto[];
}
