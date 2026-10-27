import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Clock3, MapPin } from 'lucide-react';
import { api } from '../services/api';
import type { PainelAtendimento, TicketAtendimento } from '../types';

function senha(ticket: TicketAtendimento) {
  return `A${String(ticket.numeroSequencial).padStart(3, '0')}`;
}

function hora(data: string) {
  return new Date(data).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Painel() {
  const [painel, setPainel] = useState<PainelAtendimento | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  const atualizar = useCallback(async () => {
    try {
      setPainel(await api.obterPainel());
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o painel.',
      );
    }
  }, []);

  useEffect(() => {
    void atualizar();
    const refreshId = window.setInterval(() => void atualizar(), 3000);
    const clockId = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearInterval(refreshId);
      window.clearInterval(clockId);
    };
  }, [atualizar]);

  return (
    <main className="operations-shell public-panel">
      <header className="operations-header panel-header">
        <a className="operations-brand" href="/" aria-label="Voltar ao início">
          <span className="brand-mark">
            <MapPin size={23} strokeWidth={3} />
          </span>
          <span className="brand-copy">
            <strong>AoPonto</strong>
            <small>Seu pedido, do seu jeito.</small>
          </span>
        </a>
        <span className="panel-clock">
          <Clock3 size={15} />
          {now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </header>

      <section className="panel-current" aria-live="polite">
        <p className="operations-eyebrow">Senha atual</p>
        {painel?.senhaAtual ? (
          <>
            <strong className="panel-ticket">{senha(painel.senhaAtual)}</strong>
            <p>Pedido #{painel.senhaAtual.pedido.numeroPedido}</p>
          </>
        ) : (
          <div className="panel-waiting">Aguardando próxima senha</div>
        )}
      </section>

      <section className="panel-history">
        <h1>Últimas senhas chamadas</h1>
        {painel?.ultimasChamadas.length ? (
          <ol>
            {painel.ultimasChamadas.map((chamada) => (
              <li key={chamada.id}>
                <strong>{senha(chamada.senha)}</strong>
                <span>
                  Pedido #{chamada.senha.pedido.numeroPedido}
                  {chamada.reemissao ? ' · Rechamada' : ''}
                </span>
                <time dateTime={chamada.dataChamada}>
                  {hora(chamada.dataChamada)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="panel-empty">Nenhuma senha chamada ainda.</p>
        )}
      </section>

      {error && (
        <div className="operations-error" role="alert">
          <AlertCircle size={17} />
          {error}
        </div>
      )}
      <footer className="operations-footer panel-footer">
        <span>AoPonto · Atendimento</span>
      </footer>
    </main>
  );
}
