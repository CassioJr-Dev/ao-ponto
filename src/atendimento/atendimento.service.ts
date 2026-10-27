import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AtendimentoRepository } from './atendimento.repository';

@Injectable()
export class AtendimentoService {
  constructor(private readonly repository: AtendimentoRepository) {}

  listarFila() {
    return this.repository.listarFila();
  }

  obterPainel() {
    return this.repository.obterPainel();
  }

  async chamarProxima() {
    const result = await this.repository.chamarProxima();
    if ('jaExisteChamada' in result)
      throw new ConflictException('Já existe uma senha em atendimento.');
    return result;
  }

  async reemitirChamada(pedidoId: string) {
    const result = await this.repository.reemitirChamada(pedidoId);
    if ('naoEncontrada' in result)
      throw new NotFoundException('Pedido não encontrado.');
    if ('naoEstaEmAtendimento' in result)
      throw new ConflictException(
        'A senha deste pedido não está em atendimento.',
      );
    return result;
  }

  async concluirPedido(pedidoId: string) {
    const result = await this.repository.concluirPedido(pedidoId);
    if ('naoEncontrada' in result)
      throw new NotFoundException('Pedido não encontrado.');
    if ('naoEstaEmAtendimento' in result)
      throw new ConflictException(
        'A senha deste pedido não está em atendimento.',
      );
    return result;
  }
}
