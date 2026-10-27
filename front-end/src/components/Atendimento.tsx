import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  Menu,
  RefreshCw,
  Volume2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { FilaAtendimento, TicketAtendimento } from '../types';

type Aba = 'PENDENTES' | 'EM_ATENDIMENTO' | 'CONCLUIDOS';

function senha(ticket: TicketAtendimento) {
  return `A${String(ticket.numeroSequencial).padStart(3, '0')}`;
}

function hora(data: string) {
  return new Date(data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function moeda(valor: string) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function statusPedido(ticket: TicketAtendimento) {
  if (ticket.status === 'CHAMADA') return 'Em atendimento';
  if (ticket.status === 'FINALIZADA') return 'Concluído';
  if (ticket.status === 'EXPIRADA') return 'Expirado';
  return 'Pendente';
}

function resumoItens(ticket: TicketAtendimento) {
  return ticket.pedido.itensPedido.map((item) => item.corte.nome).join(', ');
}

function resumoQuantidade(ticket: TicketAtendimento) {
  return ticket.pedido.itensPedido
    .map(
      (item) =>
        `${Number(item.quantidade).toLocaleString('pt-BR')} ${item.unidadeMedida === 'KG' ? 'kg' : item.unidadeMedida.toLowerCase()}`,
    )
    .join(' · ');
}

export function Atendimento() {
  const [fila, setFila] = useState<FilaAtendimento | null>(null);
  const [aba, setAba] = useState<Aba>('PENDENTES');
  const [filtroCorte, setFiltroCorte] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pedidoAberto, setPedidoAberto] = useState<TicketAtendimento | null>(
    null,
  );

  const atualizar = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setFila(await api.listarFila());
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar a fila.',
      );
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void atualizar();
    const intervalId = window.setInterval(() => void atualizar(true), 3000);
    return () => window.clearInterval(intervalId);
  }, [atualizar]);

  useEffect(() => {
    if (!pedidoAberto) return;
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setPedidoAberto(null);
    }
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [pedidoAberto]);

  const cortes = useMemo(() => {
    const tickets = [
      ...(fila?.pendentes ?? []),
      ...(fila?.emAtendimento ? [fila.emAtendimento] : []),
    ];
    return [
      ...new Set(
        tickets.flatMap((ticket) =>
          ticket.pedido.itensPedido.map((item) => item.corte.nome),
        ),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [fila]);

  const tickets = useMemo(() => {
    if (!fila) return [];
    const lista =
      aba === 'PENDENTES'
        ? fila.pendentes
        : aba === 'CONCLUIDOS'
          ? fila.concluidos
          : fila.emAtendimento
            ? [fila.emAtendimento]
            : [];
    return filtroCorte
      ? lista.filter((ticket) =>
          ticket.pedido.itensPedido.some(
            (item) => item.corte.nome === filtroCorte,
          ),
        )
      : lista;
  }, [aba, filtroCorte, fila]);

  async function executar(acao: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await acao();
      await atualizar(true);
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível atualizar o atendimento.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const atual = fila?.emAtendimento ?? null;
  const pendentes = fila?.pendentes.length ?? 0;
  const concluidos = fila?.concluidos.length ?? 0;

  async function concluirAtual() {
    if (atual && (await executar(() => api.concluirPedido(atual.pedidoId)))) {
      setAba('PENDENTES');
    }
  }

  return (
    <main className="operations-shell service-screen">
      <header className="operations-header service-header">
        <a className="icon-button" href="/" aria-label="Voltar ao início">
          <Menu size={21} />
        </a>
        <h1>Atendimento</h1>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={() => void atualizar()}
            aria-label="Atualizar fila"
          >
            <RefreshCw size={18} />
          </button>
          <a className="icon-button" href="/painel" aria-label="Abrir painel">
            <Bell size={18} />
          </a>
        </div>
      </header>

      <section className="service-content">
        <label className="cut-filter">
          Filtro por corte
          <select
            value={filtroCorte}
            onChange={(event) => setFiltroCorte(event.target.value)}
          >
            <option value="">Todos os cortes</option>
            {cortes.map((corte) => (
              <option key={corte} value={corte}>
                {corte}
              </option>
            ))}
          </select>
        </label>

        <nav className="queue-tabs" aria-label="Status da fila">
          <button
            className={aba === 'PENDENTES' ? 'active' : ''}
            onClick={() => setAba('PENDENTES')}
          >
            Pendentes <b>{pendentes}</b>
          </button>
          <button
            className={aba === 'EM_ATENDIMENTO' ? 'active' : ''}
            onClick={() => setAba('EM_ATENDIMENTO')}
          >
            Em atendimento <b>{atual ? 1 : 0}</b>
          </button>
          <button
            className={aba === 'CONCLUIDOS' ? 'active' : ''}
            onClick={() => setAba('CONCLUIDOS')}
          >
            Concluídos
          </button>
        </nav>

        <section className="queue-list" aria-live="polite">
          {loading ? (
            <p className="queue-empty">Carregando fila...</p>
          ) : tickets.length ? (
            tickets.map((ticket) => (
              <article
                className={`queue-card${ticket.status === 'CHAMADA' ? ' is-current' : ''}`}
                key={ticket.id}
              >
                <div className="queue-ticket">
                  <strong>{senha(ticket)}</strong>
                  <time>
                    {hora(ticket.ultimaChamada ?? ticket.dataGeracao)}
                  </time>
                </div>
                <div className="queue-details">
                  <strong>{resumoItens(ticket)}</strong>
                  <small>Pedido #{ticket.pedido.numeroPedido}</small>
                </div>
                <span className="queue-quantity">
                  {resumoQuantidade(ticket)}
                </span>
                {ticket.status === 'CHAMADA' && (
                  <span className="current-badge">Em atendimento</span>
                )}
                <button
                  className="queue-open"
                  aria-label={`Visualizar pedido ${ticket.pedido.numeroPedido}`}
                  title="Visualizar pedido"
                  onClick={() => setPedidoAberto(ticket)}
                >
                  <ChevronRight size={18} />
                </button>
              </article>
            ))
          ) : (
            <div className="queue-empty">
              <span>✓</span>
              <strong>
                {aba === 'PENDENTES'
                  ? 'Fila em dia'
                  : 'Nenhum pedido nesta lista'}
              </strong>
              <small>Os pedidos aparecerão aqui automaticamente.</small>
            </div>
          )}
        </section>

        {aba === 'PENDENTES' && (
          <div className="service-actions service-actions-pending">
            <button
              className="action-primary"
              disabled={busy || Boolean(atual) || !pendentes}
              onClick={() => void executar(api.chamarProxima)}
            >
              <Volume2 size={18} />
              Chamar próxima
            </button>
          </div>
        )}
        {aba === 'EM_ATENDIMENTO' && (
          <div className="service-actions">
            <button
              className="action-secondary"
              disabled={busy || !atual}
              onClick={() =>
                atual &&
                void executar(() => api.reemitirChamada(atual.pedidoId))
              }
            >
              <RefreshCw size={18} />
              Reemitir chamada
            </button>
            <button
              className="action-secondary"
              disabled={busy || !atual}
              onClick={() => void concluirAtual()}
            >
              <Check size={18} />
              {atual ? `Concluir ${senha(atual)}` : 'Concluir pedido'}
            </button>
          </div>
        )}
        {error && (
          <div className="operations-error" role="alert">
            <AlertCircle size={17} />
            {error}
          </div>
        )}
      </section>

      <footer className="service-footer">
        <span>
          ◷　Horário de funcionamento: 06:00 - 20:00
          <br />
          　　 Bom atendimento!
        </span>
        <a href="/painel" aria-label="Abrir painel">
          ▣
        </a>
      </footer>
      <span className="sr-only">{concluidos} pedidos concluídos</span>

      {pedidoAberto && (
        <div className="order-dialog-backdrop">
          <section
            className="order-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-dialog-title"
          >
            <header className="order-dialog-header">
              <div>
                <p className="operations-eyebrow">Detalhes do pedido</p>
                <h2 id="order-dialog-title">
                  Pedido #{pedidoAberto.pedido.numeroPedido}
                </h2>
              </div>
              <button
                className="order-dialog-close"
                aria-label="Fechar detalhes do pedido"
                onClick={() => setPedidoAberto(null)}
              >
                <X size={20} />
              </button>
            </header>

            <div className="order-dialog-meta">
              <span className="order-dialog-ticket">{senha(pedidoAberto)}</span>
              <span
                className={`order-dialog-status status-${pedidoAberto.status.toLowerCase()}`}
              >
                {statusPedido(pedidoAberto)}
              </span>
              <time dateTime={pedidoAberto.pedido.dataCriacao}>
                Pedido às {hora(pedidoAberto.pedido.dataCriacao)}
              </time>
            </div>

            <h3>Itens do pedido</h3>
            <ul className="order-dialog-items">
              {pedidoAberto.pedido.itensPedido.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.corte.nome}</strong>
                    <small>
                      {Number(item.quantidade).toLocaleString('pt-BR')}{' '}
                      {item.unidadeMedida.toLowerCase()}
                    </small>
                  </div>
                  <strong>{moeda(item.subtotal)}</strong>
                </li>
              ))}
            </ul>

            <footer className="order-dialog-total">
              <span>Total</span>
              <strong>{moeda(pedidoAberto.pedido.total)}</strong>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
