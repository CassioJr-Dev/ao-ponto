import type { Categoria, Corte, ItemCarrinho } from './types'

export function categoriaDoCorte(nome: string): Exclude<Categoria, 'Todos'> {
  const n = nome.toLocaleLowerCase('pt-BR')
  if (/frango|ave|galinha|sassami|peito/.test(n)) return 'Frango'
  if (/su[ií]no|porco|costela su/.test(n)) return 'Suíno'
  return 'Bovino'
}

export function formatarMoeda(valor: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
}

export function subtotal(item: ItemCarrinho) {
  const quantidadeEmKg = item.unidadeMedida === 'GRAMA' ? item.quantidade / 1000 : item.quantidade
  return Number(item.corte.precoKg) * quantidadeEmKg
}

export function totalDoCarrinho(itens: ItemCarrinho[]) {
  return itens.reduce((total, item) => total + subtotal(item), 0)
}

export function unidadeLabel(unidade: ItemCarrinho['unidadeMedida']) {
  return ({ KG: 'kg', GRAMA: 'g', PECA: 'un', FATIA: 'fatias' })[unidade]
}

export function imagemFallback(corte: Corte) {
  return corte.imagemUrl || `https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=500&q=80`
}
