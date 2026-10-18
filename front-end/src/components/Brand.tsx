import { MapPin } from 'lucide-react'

export function Brand() {
  return (
    <a className="brand" href="#inicio" aria-label="AoPonto início">
      <span className="brand-mark"><MapPin size={23} strokeWidth={3} /></span>
      <span className="brand-copy"><strong>AoPonto</strong><small>Seu pedido, do seu jeito.</small></span>
    </a>
  )
}
