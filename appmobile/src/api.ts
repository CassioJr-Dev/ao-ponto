import type { Corte, Fila, Painel, PedidoResponse, Ticket, UnidadeMedida } from './types';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000').replace(/\/$/, '');
export const ASSETS_URL = (process.env.EXPO_PUBLIC_ASSETS_URL || API_URL.replace(/:3000$/, ':5173')).replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${API_URL}. Confira a URL e se o servidor está ativo.`);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(message || 'Não foi possível concluir a solicitação. Tente novamente.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listarCortes: () => request<Corte[]>('/'),
  listarTodosCortes: () => request<Corte[]>('/painel/cortes'),
  criarCorte: (data: Pick<Corte, 'nome' | 'imagemUrl' | 'precoKg' | 'disponivel'>) => request<Corte>('/painel/cortes', { method: 'POST', body: JSON.stringify(data) }),
  atualizarCorte: (id: string, data: Pick<Corte, 'nome' | 'imagemUrl' | 'precoKg' | 'disponivel'>) => request<Corte>(`/painel/cortes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  excluirCorte: (id: string) => request<void>(`/painel/cortes/${id}`, { method: 'DELETE' }),
  reservar: (totemId: string, reservaId: string) => request<any>('/pedidos/reservas-senhas', { method: 'POST', body: JSON.stringify({ totemId, reservaId }) }),
  sincronizar: (order: any) => request<PedidoResponse>('/pedidos/sincronizar', { method: 'POST', body: JSON.stringify(order) }),
  fila: () => request<Fila>('/atendimento/fila'),
  painel: () => request<Painel>('/atendimento/painel'),
  chamarProxima: () => request<{ senha: Ticket | null }>('/atendimento/chamar-proxima', { method: 'POST' }),
  rechamar: (id: string) => request<{ senha: Ticket }>(`/atendimento/pedidos/${id}/rechamar`, { method: 'POST' }),
  concluir: (id: string) => request<{ concluida: Ticket }>(`/atendimento/pedidos/${id}/concluir`, { method: 'PATCH' }),
};

export const dinheiro = (n: number | string) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const senha = (n: number) => `A${String(n).padStart(3, '0')}`;
export const imagem = (url?: string) => !url ? 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=700&q=80' : /^https?:\/\//i.test(url) ? url : `${ASSETS_URL}${url.startsWith('/') ? '' : '/'}${url}`;
export const categoria = (nome: string) => /frango|ave|galinha|sassami|peito/i.test(nome) ? 'Frango' : /su[ií]no|porco|costela su/i.test(nome) ? 'Suíno' : 'Bovino';
export const subtotal = (q: number, unit: UnidadeMedida, price: string) => Number(price) * (unit === 'GRAMA' ? q / 1000 : q);
