import { Clock3, Store } from 'lucide-react'

export function Footer({ order = false }: { order?: boolean }) {
  return (
    <footer className={`site-footer${order ? ' order-footer' : ''}`}>
      <span><Clock3 size={17} /><span>Horário de funcionamento: 06:00 - 20:00</span></span>
      <span className="footer-help">Precisa de ajuda? Chame um atendente.</span>
      {order && <span className="footer-important"><Store size={35} /><span><b>Importante</b><small>Após confirmar, você receberá uma senha e será chamado no painel.</small></span></span>}
    </footer>
  )
}
