import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CriarPedidoDto } from './dto/criar-pedido.dto';
import { PedidoResponseDto } from './dto/pedido-response.dto';
import { PedidosService } from './pedidos.service';

@Controller('pedidos')
@ApiTags('Pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar pedido do totem',
    description:
      'Valida os itens e calcula os valores no backend. Pedido, itens e senha são persistidos na mesma transação antes da resposta. Repetir a mesma seleção com o mesmo sessaoId recupera o pedido já gravado; enviar itens diferentes para uma sessão já confirmada resulta em conflito. Preços e subtotais não devem ser enviados pelo cliente.',
  })
  @ApiCreatedResponse({
    description:
      'Pedido e senha persistidos. Também é retornado quando uma repetição idêntica recupera o pedido existente.',
    type: PedidoResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Corpo inválido: UUID malformado, lista vazia, quantidade menor ou igual a zero, mais de três casas decimais, unidade inválida ou campos não permitidos.',
    schema: {
      example: {
        statusCode: 400,
        message: ['itens must contain at least 1 elements'],
        error: 'Bad Request',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Um ou mais cortes não existem ou estão indisponíveis.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Um ou mais cortes não existem ou estão indisponíveis.',
        error: 'Not Found',
      },
    },
  })
  @ApiConflictResponse({
    description:
      'A sessão já possui um pedido confirmado com itens diferentes dos enviados.',
    schema: {
      example: {
        statusCode: 409,
        message: 'Esta sessão já possui um pedido confirmado diferente.',
        error: 'Conflict',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description:
      'Falha interna ou de persistência. A transação é revertida e nenhuma senha é retornada como confirmada.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
      },
    },
  })
  criar(@Body() dto: CriarPedidoDto) {
    return this.pedidosService.criar(dto);
  }
}
