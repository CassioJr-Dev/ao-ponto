import { ShoppingCart } from 'lucide-react'
import { Brand } from './Brand'

export function Header({ count, onCart }: { count: number; onCart: () => void }) {
  return (
    <header className="topbar">
      <Brand />
      <button className="header-cart" onClick={onCart} aria-label={`Meu pedido, ${count} itens`}>
        <ShoppingCart size={21} /><span>Meu pedido</span><b>{count}</b>
      </button>
    </header>
  )
}
