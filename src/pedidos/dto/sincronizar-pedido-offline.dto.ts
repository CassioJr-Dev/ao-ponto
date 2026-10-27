import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';
import { CriarPedidoDto } from './criar-pedido.dto';

export class SincronizarPedidoOfflineDto extends CriarPedidoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  totemId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  reservaId: string;

  @ApiProperty({ description: 'Número de senha reservado previamente.' })
  @IsInt()
  @Min(1)
  numeroSequencial: number;
}
