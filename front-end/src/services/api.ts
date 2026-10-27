import type {
  Corte,
  FilaAtendimento,
  PainelAtendimento,
  PedidoResponse,
  TicketAtendimento,
  UnidadeMedida,
} from '../types';
import type { OfflineOrder, Reservation } from './offlineStore';

const apiHost = window.location.hostname.includes(':')
  ? `[${window.location.hostname}]`
  : window.location.hostname;
const apiOnCurrentHost = `${window.location.protocol}//${apiHost}:3000`;
const configuredApiUrl = import.meta.env.VITE_API_URL;
const openedFromLan = !['localhost', '127.0.0.1', '::1'].includes(
  window.location.hostname,
);
const configuredApiUsesLoopback =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(
    configuredApiUrl ?? '',
  );
const API_URL =
  !configuredApiUrl || (openedFromLan && configuredApiUsesLoopback)
    ? apiOnCurrentHost
    : configuredApiUrl;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message;
    throw new Error(
      message || 'Não foi possível concluir sua solicitação. Tente novamente.',
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  listarCortes: () => request<Corte[]>('/'),
  criarPedido: (
    sessaoId: string,
    itens: {
      corteId: string;
      quantidade: number;
      unidadeMedida: UnidadeMedida;
    }[],
  ) =>
    request<PedidoResponse>('/pedidos', {
      method: 'POST',
      body: JSON.stringify({ sessaoId, itens }),
    }),
  reservarSenhas: (totemId: string, reservaId: string) =>
    request<Omit<Reservation, 'nextNumber'>>('/pedidos/reservas-senhas', {
      method: 'POST',
      body: JSON.stringify({ totemId, reservaId }),
    }),
  sincronizarPedido: (order: OfflineOrder) =>
    request<PedidoResponse>('/pedidos/sincronizar', {
      method: 'POST',
      body: JSON.stringify({
        sessaoId: order.sessaoId,
        totemId: order.totemId,
        reservaId: order.reservaId,
        numeroSequencial: order.numeroSequencial,
        itens: order.itens,
      }),
    }),
  criarCorte: (corte: {
    nome: string;
    imagemUrl: string;
    precoKg: string;
    disponivel: boolean;
  }) =>
    request<Corte>('/cortes', {
      method: 'POST',
      body: JSON.stringify(corte),
    }),
  listarFila: () => request<FilaAtendimento>('/atendimento/fila'),
  obterPainel: () => request<PainelAtendimento>('/atendimento/painel'),
  chamarProxima: () =>
    request<{ senha: TicketAtendimento | null }>(
      '/atendimento/chamar-proxima',
      { method: 'POST' },
    ),
  reemitirChamada: (pedidoId: string) =>
    request<{ senha: TicketAtendimento }>(
      `/atendimento/pedidos/${pedidoId}/rechamar`,
      { method: 'POST' },
    ),
  concluirPedido: (pedidoId: string) =>
    request<{ concluida: TicketAtendimento }>(
      `/atendimento/pedidos/${pedidoId}/concluir`,
      { method: 'PATCH' },
    ),
};
