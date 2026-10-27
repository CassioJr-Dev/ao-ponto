import { Check } from 'lucide-react';
import type { PedidoResponse } from '../types';
import { Brand } from './Brand';

export function Confirmation({
  pedido,
  onNewOrder,
}: {
  pedido: PedidoResponse;
  onNewOrder: () => void;
}) {
  const pendente = pedido.sincronizacaoPendente === true;
  return (
    <main className="confirmation">
      <header className="topbar">
        <Brand />
      </header>
      <section className="confirmation-body">
        <span className="success-icon">
          <Check size={38} strokeWidth={3} />
        </span>
        <p className="eyebrow">
          {pendente ? 'Salvo neste totem' : 'Tudo certo!'}
        </p>
        <h1>
          {pendente ? 'Pedido aguardando sincronização' : 'Pedido confirmado!'}
        </h1>
        <p className="confirmation-subtitle">Sua senha de atendimento é:</p>
        <div className="ticket">
          <span>A</span>
          {String(pedido.senha.numeroSequencial).padStart(3, '0')}
        </div>
        <p className="confirmation-detail">
          {pendente ? (
            'O pedido está salvo neste totem e será enviado quando a conexão voltar.'
          ) : (
            <>
              Seu pedido <b>#{pedido.numeroPedido}</b> já foi registrado.
              <br />
              Aguarde ser chamado no painel.
            </>
          )}
        </p>
        <button className="button-secondary" onClick={onNewOrder}>
          Fazer novo pedido
        </button>
      </section>
    </main>
  );
}
