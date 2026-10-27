import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDecimal,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CriarCorteDto {
  @ApiProperty({
    description: 'Nome apresentado na lista de cortes do totem.',
    example: 'Alcatra',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @ApiProperty({
    description: 'URL completa da imagem do corte.',
    example: 'https://example.com/imagens/alcatra.jpg',
  })
  @IsString()
  @IsUrl({ require_protocol: true, require_tld: false })
  @MaxLength(2048)
  imagemUrl: string;

  @ApiProperty({
    description:
      'Preço por quilograma como string decimal, com até duas casas decimais e até dez dígitos inteiros.',
    type: String,
    example: '59.90',
    pattern: '^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$',
  })
  @IsString()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  precoKg: string;

  @ApiPropertyOptional({
    description:
      'Indica se o corte aparece no totem. Quando omitido, o corte é criado como disponível.',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  disponivel?: boolean;
}
