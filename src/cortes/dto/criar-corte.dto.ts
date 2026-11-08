import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDecimal,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
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

  @ApiPropertyOptional({
    description: 'URL da imagem do corte. Quando omitida ou vazia, será usado o placeholder do catálogo.',
    example: 'https://example.com/imagens/alcatra.jpg',
  })
  @IsOptional()
  @ValidateIf((_obj, value) => value !== '')
  @IsString()
  @Matches(/^(?:https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?|\/(?!\/)[^\s]*)$/i, {
    message: 'imagemUrl deve ser uma URL HTTP/HTTPS ou um caminho local iniciado por /.',
  })
  @MaxLength(2048)
  imagemUrl?: string;

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
