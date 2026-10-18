import { ApiProperty } from '@nestjs/swagger';

export class CorteResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: 'e7b58a06-6ed8-4636-9fb2-8fe12856f72d',
  })
  id: string;

  @ApiProperty({ example: 'Alcatra' })
  nome: string;

  @ApiProperty({ example: 'https://example.com/imagens/alcatra.jpg' })
  imagemUrl: string;

  @ApiProperty({
    type: String,
    description: 'Preço por quilograma, serializado como decimal em string.',
    example: '59.90',
  })
  precoKg: string;

  @ApiProperty({ example: true })
  disponivel: boolean;
}
