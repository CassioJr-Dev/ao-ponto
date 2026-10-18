import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ShoppingBag } from 'lucide-react'
import { api } from './services/api'
import type { Corte, ItemCarrinho, PedidoResponse, Tela } from './types'
import { Header } from './components/Header'
import { Catalog } from './components/Catalog'
import { Cart } from './components/Cart'
import { Confirmation } from './components/Confirmation'
import { Footer } from './components/Footer'

function getSessionId() {
  const key = 'ao-ponto-sessao'
  let id = sessionStorage.getItem(key)
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id) }
  return id
}

export default function App() {
  const [cortes, setCortes] = useState<Corte[]>([])
  const [items, setItems] = useState<ItemCarrinho[]>([])
  const [tela, setTela] = useState<Tela>('catalogo')
  const [pedido, setPedido] = useState<PedidoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const carregarCortes = useCallback(async () => {
    setLoading(true)
    try { setCortes(await api.listarCortes()); setError('') }
    catch { setError('Não foi possível carregar os cortes. Verifique sua conexão e tente novamente.'); }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void carregarCortes() }, [carregarCortes])

  function addItem(item: ItemCarrinho) { setItems((current) => [...current, item]); setError('') }
  function updateItem(index: number, quantity: number) { setItems((current) => current.map((item, i) => i === index ? { ...item, quantidade: quantity } : item)) }
  function removeItem(index: number) { setItems((current) => current.filter((_, i) => i !== index)) }
  async function confirmarPedido() {
    if (!items.length) { setError('Adicione pelo menos um corte ao pedido.'); return }
    setSubmitting(true); setError('')
    try {
      const saved = await api.criarPedido(getSessionId(), items.map(({ corte, quantidade, unidadeMedida }) => ({ corteId: corte.id, quantidade, unidadeMedida })))
      setPedido(saved); setTela('confirmacao'); setItems([])
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível registrar o pedido. Tente novamente.') }
    finally { setSubmitting(false) }
  }
  function novoPedido() { sessionStorage.removeItem('ao-ponto-sessao'); setPedido(null); setTela('catalogo') }

  if (tela === 'confirmacao' && pedido) return <div className="app-shell"><Confirmation pedido={pedido} onNewOrder={novoPedido} /><Footer /></div>
  const count = items.length
  return <div className="app-shell">
    <Header count={count} onCart={() => { setTela('carrinho'); setError('') }} />
    <main className="main-content">{tela === 'catalogo' ? loading ? <div className="loading-state"><span className="spinner" /><p>Carregando cortes...</p></div> : error && !cortes.length ? <div className="error-state"><AlertCircle size={30} /><h2>Ops, algo deu errado</h2><p>{error}</p><button className="button-primary" onClick={() => void carregarCortes()}>Tentar novamente</button></div> : <Catalog cortes={cortes} addItem={addItem} /> : <Cart items={items} update={updateItem} remove={removeItem} onBack={() => { setTela('catalogo'); setError('') }} onConfirm={() => void confirmarPedido()} loading={submitting} />}
      {tela === 'catalogo' && !loading && cortes.length > 0 && <button className="floating-cart" onClick={() => setTela('carrinho')}><ShoppingBag size={17} /> Ver meu pedido{count ? ` (${count} ${count === 1 ? 'item' : 'itens'})` : ''}</button>}
      {error && (tela === 'carrinho' || cortes.length > 0) && <div className="error-banner" role="alert"><AlertCircle size={18} />{error}<button onClick={() => setError('')} aria-label="Fechar mensagem">×</button></div>}
    </main>
    <Footer order={tela === 'carrinho'} />
  </div>
}
