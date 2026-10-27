import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiForbiddenResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AtendimentoService } from './atendimento.service';
import { LocalNetworkGuard } from './local-network.guard';

@UseGuards(LocalNetworkGuard)
@Controller('atendimento')
@ApiTags('Atendimento')
export class AtendimentoController {
  constructor(private readonly atendimentoService: AtendimentoService) {}

  @Get('fila')
  @ApiOperation({
    summary: 'Consultar pedidos pendentes, em atendimento e concluídos',
  })
  listarFila() {
    return this.atendimentoService.listarFila();
  }

  @Get('painel')
  @ApiOperation({ summary: 'Consultar a senha atual e as últimas chamadas' })
  @ApiForbiddenResponse({ description: 'Disponível somente na rede local.' })
  obterPainel() {
    return this.atendimentoService.obterPainel();
  }

  @Post('chamar-proxima')
  @ApiOperation({ summary: 'Chamar o próximo pedido da fila' })
  chamarProxima() {
    return this.atendimentoService.chamarProxima();
  }

  @Post('pedidos/:pedidoId/rechamar')
  @ApiOperation({ summary: 'Reemitir a chamada do pedido em atendimento' })
  reemitirChamada(@Param('pedidoId', new ParseUUIDPipe()) pedidoId: string) {
    return this.atendimentoService.reemitirChamada(pedidoId);
  }

  @Patch('pedidos/:pedidoId/concluir')
  @ApiOperation({ summary: 'Concluir o pedido em atendimento' })
  concluirPedido(@Param('pedidoId', new ParseUUIDPipe()) pedidoId: string) {
    return this.atendimentoService.concluirPedido(pedidoId);
  }
}
