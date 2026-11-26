export type UnidadeMedida = 'KG' | 'GRAMA' | 'PECA' | 'FATIA';
export type Corte = { id: string; nome: string; imagemUrl: string; precoKg: string; disponivel: boolean };
export type ItemCarrinho = { corte: Corte; quantidade: number; unidadeMedida: UnidadeMedida };
export type PedidoResponse = { numeroPedido?: number; total: string; senha: { numeroSequencial: number }; sincronizacaoPendente?: boolean };
export type ItemPedido = { id: string; quantidade: string; unidadeMedida: UnidadeMedida; subtotal: string; corte: Pick<Corte, 'id' | 'nome' | 'imagemUrl' | 'precoKg'> };
export type Ticket = {
  id: string; pedidoId: string; numeroSequencial: number; status: 'PENDENTE' | 'CHAMADA' | 'FINALIZADA' | 'EXPIRADA';
  quantidadeChamadas: number; numeroReemissoes: number; ultimaChamada: string | null; dataGeracao: string;
  pedido: { id: string; numeroPedido: number; status: 'REGISTRADO' | 'EM_PREPARO' | 'CONCLUIDO'; total: string; dataCriacao: string; itensPedido: ItemPedido[] };
};
export type Fila = { pendentes: Ticket[]; emAtendimento: Ticket | null; concluidos: Ticket[] };
export type Painel = { senhaAtual: Ticket | null; ultimasChamadas: { id: string; dataChamada: string; reemissao: boolean; senha: Ticket }[] };
