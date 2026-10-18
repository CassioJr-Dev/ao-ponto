import type { Corte, PedidoResponse, UnidadeMedida } from '../types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message
    throw new Error(message || 'Não foi possível concluir sua solicitação. Tente novamente.')
  }

  return response.json() as Promise<T>
}

export const api = {
  listarCortes: () => request<Corte[]>('/'),
  criarPedido: (sessaoId: string, itens: { corteId: string; quantidade: number; unidadeMedida: UnidadeMedida }[]) =>
    request<PedidoResponse>('/pedidos', {
      method: 'POST',
      body: JSON.stringify({ sessaoId, itens }),
    }),
}
