import { Check } from 'lucide-react'
import type { PedidoResponse } from '../types'
import { Brand } from './Brand'

export function Confirmation({ pedido, onNewOrder }: { pedido: PedidoResponse; onNewOrder: () => void }) {
  return <main className="confirmation">
    <header className="topbar"><Brand /></header>
    <section className="confirmation-body"><span className="success-icon"><Check size={38} strokeWidth={3} /></span><p className="eyebrow">Tudo certo!</p><h1>Pedido confirmado!</h1><p className="confirmation-subtitle">Sua senha de atendimento é:</p><div className="ticket"><span>A</span>{String(pedido.senha.numeroSequencial).padStart(3, '0')}</div><p className="confirmation-detail">Seu pedido <b>#{pedido.numeroPedido}</b> já foi registrado.<br />Aguarde ser chamado no painel.</p><button className="button-secondary" onClick={onNewOrder}>Fazer novo pedido</button></section>
  </main>
}
