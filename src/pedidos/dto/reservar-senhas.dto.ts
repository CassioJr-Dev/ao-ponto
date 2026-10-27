import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReservarSenhasDto {
  @ApiProperty({
    description: 'UUID persistente deste totem/navegador.',
    format: 'uuid',
  })
  @IsUUID()
  totemId: string;

  @ApiProperty({
    description: 'UUID idempotente da solicitação desta reserva.',
    format: 'uuid',
  })
  @IsUUID()
  reservaId: string;
}
