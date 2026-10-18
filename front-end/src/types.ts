export type UnidadeMedida = 'KG' | 'GRAMA' | 'PECA' | 'FATIA'
export type Categoria = 'Todos' | 'Bovino' | 'Suíno' | 'Frango'
export type Tela = 'catalogo' | 'carrinho' | 'confirmacao'

export interface Corte {
  id: string
  nome: string
  imagemUrl: string
  precoKg: string
  disponivel: boolean
}

export interface ItemCarrinho {
  corte: Corte
  quantidade: number
  unidadeMedida: UnidadeMedida
}

export interface PedidoResponse {
  numeroPedido: number
  total: string
  senha: { numeroSequencial: number }
}
