export type UnidadeMedida = 'KG' | 'GRAMA' | 'PECA' | 'FATIA';
export type Categoria = 'Todos' | 'Bovino' | 'Suíno' | 'Frango';
export type Tela = 'catalogo' | 'carrinho' | 'confirmacao';

export interface Corte {
  id: string;
  nome: string;
  imagemUrl: string;
  precoKg: string;
  disponivel: boolean;
}

export interface ItemCarrinho {
  corte: Corte;
  quantidade: number;
  unidadeMedida: UnidadeMedida;
}

export interface PedidoResponse {
  numeroPedido?: number;
  total: string;
  senha: { numeroSequencial: number };
  sincronizacaoPendente?: boolean;
}

export interface TicketAtendimento {
  id: string;
  pedidoId: string;
  numeroSequencial: number;
  status: 'PENDENTE' | 'CHAMADA' | 'FINALIZADA' | 'EXPIRADA';
  quantidadeChamadas: number;
  numeroReemissoes: number;
  ultimaChamada: string | null;
  dataGeracao: string;
  pedido: {
    id: string;
    numeroPedido: number;
    status: 'REGISTRADO' | 'EM_PREPARO' | 'CONCLUIDO';
    total: string;
    dataCriacao: string;
    itensPedido: {
      id: string;
      quantidade: string;
      unidadeMedida: UnidadeMedida;
      subtotal: string;
      corte: {
        id: string;
        nome: string;
        imagemUrl: string;
        precoKg: string;
      };
    }[];
  };
}

export interface FilaAtendimento {
  pendentes: TicketAtendimento[];
  emAtendimento: TicketAtendimento | null;
  concluidos: TicketAtendimento[];
}

export interface PainelAtendimento {
  senhaAtual: TicketAtendimento | null;
  ultimasChamadas: {
    id: string;
    dataChamada: string;
    reemissao: boolean;
    senha: TicketAtendimento;
  }[];
}
