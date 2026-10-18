import { ArrowLeft, Check, Minus, Plus, Trash2 } from 'lucide-react'
import type { ItemCarrinho } from '../types'
import { formatarMoeda, imagemFallback, subtotal, unidadeLabel } from '../utils'

export function Cart({ items, update, remove, onBack, onConfirm, loading }: {
  items: ItemCarrinho[]; update: (index: number, quantity: number) => void; remove: (index: number) => void
  onBack: () => void; onConfirm: () => void; loading: boolean
}) {
  const total = items.reduce((sum, item) => sum + subtotal(item), 0)
  return <section className="cart-screen">
    <div className="screen-title"><button className="back-link" onClick={onBack}><ArrowLeft size={18} /> Voltar</button><h1>Meu pedido</h1><span className="title-spacer" /></div>
    {items.length ? <>
      <div className="cart-list">{items.map((item, index) => <article className="cart-item" key={`${item.corte.id}-${item.unidadeMedida}-${index}`}>
        <img src={imagemFallback(item.corte)} alt="" /><div className="cart-description"><strong>{item.corte.nome}</strong><small>{formatarMoeda(item.corte.precoKg)} / kg</small><small className="unit-caption">{item.unidadeMedida === 'GRAMA' ? 'Gramas' : item.unidadeMedida === 'PECA' ? 'Peças' : item.unidadeMedida === 'FATIA' ? 'Fatias' : 'Quilogramas'}</small></div>
        <div className="cart-controls"><div className="stepper"><button aria-label="Diminuir quantidade" onClick={() => update(index, Math.max(item.unidadeMedida === 'KG' ? 0.001 : 1, Number((item.quantidade - (item.unidadeMedida === 'KG' ? 0.1 : 1)).toFixed(3))))}><Minus size={14} /></button><span>{item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} <small>{unidadeLabel(item.unidadeMedida)}</small></span><button aria-label="Aumentar quantidade" onClick={() => update(index, Number((item.quantidade + (item.unidadeMedida === 'KG' ? 0.1 : 1)).toFixed(3)))}><Plus size={14} /></button></div><strong className="line-price">{formatarMoeda(subtotal(item))}</strong></div>
        <button className="remove-item" onClick={() => remove(index)} aria-label={`Remover ${item.corte.nome}`}><Trash2 size={17} /></button>
      </article>)}</div>
      <div className="order-total"><span>Total do pedido</span><strong>{formatarMoeda(total)}</strong></div>
      <div className="pickup-note"><span>✓</span><div><strong>Desejo escolher minha peça no balcão</strong><small>Marque esta opção se quiser escolher sua peça diretamente com o atendente.</small></div></div>
      <button className="button-primary confirm-button" onClick={onConfirm} disabled={loading}>{loading ? <><span className="spinner" /> Registrando pedido...</> : <><Check size={18} /> Confirmar pedido</>}</button>
      <button className="button-secondary continue-button" onClick={onBack}>Continuar comprando</button>
    </> : <div className="empty-cart"><span>🛒</span><h2>Seu pedido está vazio</h2><p>Escolha seus cortes favoritos para começar.</p><button className="button-primary" onClick={onBack}>Ver cortes</button></div>}
  </section>
}
