import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CorteResponseDto } from './dto/corte-response.dto';
import { CriarCorteDto } from './dto/criar-corte.dto';
import { CortesService } from './cortes.service';

@Controller()
@ApiTags('Cortes')
export class CortesController {
  constructor(private readonly cortesService: CortesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar cortes disponíveis',
    description:
      'Retorna apenas os cortes disponíveis para seleção no totem. A lista pode ser vazia quando não houver cortes disponíveis.',
  })
  @ApiOkResponse({
    description: 'Lista de cortes disponíveis, ordenada pelo nome.',
    type: CorteResponseDto,
    isArray: true,
  })
  @ApiInternalServerErrorResponse({
    description: 'Falha interna ao consultar o catálogo.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
      },
    },
  })
  listarDisponiveis() {
    return this.cortesService.listarDisponiveis();
  }

  @Post('cortes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastrar corte',
    description:
      'Cadastra um corte no PostgreSQL para popular o catálogo consumido pelo totem. O UUID e a data de cadastro são gerados pelo sistema. Se disponivel não for informado, o corte é criado como disponível.',
  })
  @ApiCreatedResponse({
    description: 'Corte cadastrado e pronto para consulta.',
    type: CorteResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Entrada inválida: nome ausente ou maior que 120 caracteres, URL inválida, preço fora do formato decimal ou disponibilidade não booleana.',
    schema: {
      example: {
        statusCode: 400,
        message: ['precoKg must match the required pattern'],
        error: 'Bad Request',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Falha interna ao persistir o corte.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
      },
    },
  })
  criar(@Body() dto: CriarCorteDto) {
    return this.cortesService.criar(dto);
  }
}
