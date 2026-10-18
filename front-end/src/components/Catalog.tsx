import { useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import type { Categoria, Corte, ItemCarrinho, UnidadeMedida } from '../types'
import { categoriaDoCorte, formatarMoeda, imagemFallback } from '../utils'

const categorias: Categoria[] = ['Todos', 'Bovino', 'Suíno', 'Frango']

export function Catalog({ cortes, addItem }: { cortes: Corte[]; addItem: (item: ItemCarrinho) => void }) {
  const [filtro, setFiltro] = useState<Categoria>('Todos')
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<Corte | null>(null)
  const [quantidade, setQuantidade] = useState('0,500')
  const [unidade, setUnidade] = useState<UnidadeMedida>('KG')

  const filtrados = useMemo(() => cortes.filter((corte) =>
    corte.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) &&
    (filtro === 'Todos' || categoriaDoCorte(corte.nome) === filtro),
  ), [busca, cortes, filtro])

  function abrir(corte: Corte) {
    setSelecionado(corte)
    setQuantidade(unidade === 'KG' ? '0,500' : unidade === 'GRAMA' ? '500' : '1')
  }

  function adicionar() {
    if (!selecionado) return
    const valor = Number(quantidade.replace(',', '.'))
    if (!Number.isFinite(valor) || valor <= 0) return
    addItem({ corte: selecionado, quantidade: valor, unidadeMedida: unidade })
    setSelecionado(null)
  }

  return (
    <>
      <section className="catalog-intro">
        <div><p className="eyebrow">Fresquinho pra você</p><h1>Selecione o corte desejado</h1><p>Toque em um corte para ver mais detalhes e adicionar ao pedido.</p></div>
      </section>
      <div className="search-box"><Search size={19} /><input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar corte..." aria-label="Buscar corte" /></div>
      <nav className="filters" aria-label="Filtrar por tipo de carne">{categorias.map((categoria) => <button key={categoria} className={filtro === categoria ? 'active' : ''} onClick={() => setFiltro(categoria)}>{categoria}</button>)}</nav>
      {filtrados.length ? <div className="product-grid">{filtrados.map((corte) => <button className="product-card" key={corte.id} onClick={() => abrir(corte)}>
        <span className="product-photo"><img src={imagemFallback(corte)} alt={corte.nome} loading="lazy" /><span className="quick-add"><Plus size={18} /></span></span>
        <span className="product-info"><strong>{corte.nome}</strong><small>{formatarMoeda(corte.precoKg)} / kg</small></span>
      </button>)}</div> : <div className="empty-catalog"><span>🥩</span><h2>Nenhum corte encontrado</h2><p>Tente buscar com outro nome ou categoria.</p></div>}
      {selecionado && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelecionado(null)}><section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" onClick={() => setSelecionado(null)} aria-label="Fechar"><X size={20} /></button>
        <img className="modal-image" src={imagemFallback(selecionado)} alt="" />
        <p className="eyebrow">{categoriaDoCorte(selecionado.nome)}</p><h2 id="modal-title">{selecionado.nome}</h2><p className="modal-price">{formatarMoeda(selecionado.precoKg)} <span>/ kg</span></p>
        <label className="field-label" htmlFor="unit">Como deseja comprar?</label><select id="unit" value={unidade} onChange={(event) => { const next = event.target.value as UnidadeMedida; setUnidade(next); setQuantidade(next === 'KG' ? '0,500' : next === 'GRAMA' ? '500' : '1') }}><option value="KG">Quilogramas (kg)</option><option value="GRAMA">Gramas (g)</option><option value="PECA">Peças</option><option value="FATIA">Fatias</option></select>
        <label className="field-label" htmlFor="quantity">Quantidade</label><input id="quantity" className="quantity-input" inputMode="decimal" value={quantidade} onChange={(event) => setQuantidade(event.target.value)} />
        <button className="button-primary modal-add" onClick={adicionar}>Adicionar ao pedido <Plus size={18} /></button>
      </section></div>}
    </>
  )
}
