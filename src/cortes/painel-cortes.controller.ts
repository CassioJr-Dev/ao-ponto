import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CortesService } from './cortes.service';
import { CriarCorteDto } from './dto/criar-corte.dto';
import { AtualizarCorteDto } from './dto/atualizar-corte.dto';
import { CorteResponseDto } from './dto/corte-response.dto';

@Controller('painel/cortes')
@ApiTags('Painel de gerenciamento')
export class PainelCortesController {
  constructor(private readonly cortesService: CortesService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os cortes para gerenciamento',
    description:
      'Inclui cortes disponíveis e indisponíveis, ordenados pelo nome.',
  })
  @ApiOkResponse({ type: CorteResponseDto, isArray: true })
  listarTodos() {
    return this.cortesService.listarTodos();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar corte pelo painel de gerenciamento' })
  @ApiCreatedResponse({ type: CorteResponseDto })
  @ApiBadRequestResponse({ description: 'Dados do corte inválidos.' })
  criar(@Body() dto: CriarCorteDto) {
    return this.cortesService.criar(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar dados de um corte',
    description: 'Altera apenas os campos enviados no corpo da requisição.',
  })
  @ApiOkResponse({ type: CorteResponseDto })
  @ApiBadRequestResponse({ description: 'UUID ou dados do corte inválidos.' })
  @ApiNotFoundResponse({ description: 'Corte não encontrado.' })
  atualizar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AtualizarCorteDto,
  ) {
    return this.cortesService.atualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir um corte' })
  @ApiNoContentResponse({ description: 'Corte excluído.' })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiNotFoundResponse({ description: 'Corte não encontrado.' })
  @ApiConflictResponse({
    description: 'O corte está associado a um ou mais pedidos.',
  })
  deletar(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.cortesService.deletar(id);
  }
}
