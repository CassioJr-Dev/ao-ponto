import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class AtualizarCorteDto {
  @ApiPropertyOptional({ example: 'Alcatra', maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome?: string;

  @ApiPropertyOptional({
    description: 'URL da imagem. Envie vazio para remover a imagem atual.',
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

  @ApiPropertyOptional({
    type: String,
    example: '59.90',
    pattern: '^(?:0|[1-9]\\d{0,9})(?:\\.\\d{1,2})?$',
  })
  @IsOptional()
  @IsString()
  @IsDecimal({ decimal_digits: '0,2', force_decimal: false })
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  precoKg?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  disponivel?: boolean;
}
