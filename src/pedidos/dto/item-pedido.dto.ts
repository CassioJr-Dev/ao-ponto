import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UnidadeMedida } from '../enums/unidade-medida.enum';

export class ItemPedidoDto {
  @ApiProperty({
    description: 'Identificador UUID de um corte existente e disponível.',
    format: 'uuid',
    example: 'e7b58a06-6ed8-4636-9fb2-8fe12856f72d',
  })
  @IsUUID()
  corteId: string;

  @ApiProperty({
    description: 'Quantidade maior que zero, com até três casas decimais.',
    type: Number,
    minimum: 0.001,
    maximum: 999999999.999,
    example: 0.75,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999999.999)
  quantidade: number;

  @ApiProperty({
    description: 'Unidade informada para a quantidade selecionada.',
    enum: UnidadeMedida,
    enumName: 'UnidadeMedida',
    example: UnidadeMedida.KG,
  })
  @IsEnum(UnidadeMedida)
  unidadeMedida: UnidadeMedida;
}
