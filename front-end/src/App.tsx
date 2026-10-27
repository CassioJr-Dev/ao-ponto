import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ShoppingBag } from 'lucide-react';
import { api } from './services/api';
import {
  consumeNumberAndQueue,
  getPendingReservationId,
  getTotemId,
  listPendingOrders,
  listReservations,
  markPendingOrderError,
  removePendingOrder,
  saveReservation,
} from './services/offlineStore';
import type { Corte, ItemCarrinho, PedidoResponse, Tela } from './types';
import { Header } from './components/Header';
import { Catalog } from './components/Catalog';
import { Cart } from './components/Cart';
import { Confirmation } from './components/Confirmation';
import { Footer } from './components/Footer';
import { Atendimento } from './components/Atendimento';
import { Painel } from './components/Painel';
import { CriarCorte } from './components/CriarCorte';
import { subtotal } from './utils';
import './styles/operations.css';

function getSessionId() {
  const key = 'ao-ponto-sessao';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

let reservationInFlight: Promise<void> | null = null;
let syncInFlight: Promise<void> | null = null;

function TotemApp() {
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [items, setItems] = useState<ItemCarrinho[]>([]);
  const [tela, setTela] = useState<Tela>('catalogo');
  const [pedido, setPedido] = useState<PedidoResponse | null>(null);
  const [offlineSessionId, setOfflineSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(
    async () => setPendingCount((await listPendingOrders()).length),
    [],
  );

  const syncPending = useCallback(async () => {
    if (!navigator.onLine) return;
    if (syncInFlight) return syncInFlight;
    syncInFlight = (async () => {
      for (const order of await listPendingOrders()) {
        try {
          const confirmed = await api.sincronizarPedido(order);
          await removePendingOrder(order.sessaoId);
          if (order.sessaoId === offlineSessionId) setPedido(confirmed);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Falha ao sincronizar pedido.';
          await markPendingOrderError(order.sessaoId, message);
          // A lost response is retried idempotently with this same session and ticket.
          break;
        }
      }
      await refreshPendingCount();
    })();
    try {
      await syncInFlight;
    } finally {
      syncInFlight = null;
    }
  }, [offlineSessionId, refreshPendingCount]);

  const reservarBloco = useCallback(async () => {
    if (!navigator.onLine) return;
    if (reservationInFlight) return reservationInFlight;
    reservationInFlight = (async () => {
      const totemId = await getTotemId();
      const reservaId = await getPendingReservationId();
      const reservation = await api.reservarSenhas(totemId, reservaId);
      await saveReservation({
        ...reservation,
        catalogo: reservation.catalogo.filter((corte) => corte.disponivel),
      });
    })();
    try {
      await reservationInFlight;
    } finally {
      reservationInFlight = null;
    }
  }, []);

  const carregarCortes = useCallback(async () => {
    setLoading(true);
    try {
      const reservations = await listReservations();
      const active = reservations.find(
        (block) => block.nextNumber <= block.numeroFim,
      );
      if (navigator.onLine) {
        await syncPending();
        if (!active || active.numeroFim - active.nextNumber < 5) {
          try {
            await reservarBloco();
          } catch {
            /* Keep using cached inventory while online API is unavailable. */
          }
        }
      }
      const available = await listReservations();
      const usable = available.find(
        (block) => block.nextNumber <= block.numeroFim,
      );
      if (usable)
        setCortes(usable.catalogo.filter((corte) => corte.disponivel));
      else if (navigator.onLine) setCortes(await api.listarCortes());
      else
        throw new Error(
          'Este totem ainda não tem catálogo e senhas reservadas. Conecte à internet para preparar a operação offline.',
        );
      setError('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os cortes.',
      );
    } finally {
      setLoading(false);
      await refreshPendingCount();
    }
  }, [refreshPendingCount, reservarBloco, syncPending]);

  useEffect(() => {
    void carregarCortes();
  }, [carregarCortes]);
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void syncPending();
      void carregarCortes();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const interval = window.setInterval(() => {
      void syncPending();
    }, 15000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(interval);
    };
  }, [carregarCortes, syncPending]);

  function addItem(item: ItemCarrinho) {
    setItems((current) => [...current, item]);
    setError('');
  }
  function updateItem(index: number, quantity: number) {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, quantidade: quantity } : item,
      ),
    );
  }
  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  async function confirmarPedido() {
    if (!items.length) {
      setError('Adicione pelo menos um corte ao pedido.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const blocks = await listReservations();
      const active = blocks.find(
        (block) => block.nextNumber <= block.numeroFim,
      );
      if (!active) {
        if (navigator.onLine) {
          await reservarBloco();
        }
      }
      const totemId = await getTotemId();
      const reservation = (await listReservations()).find(
        (block) => block.nextNumber <= block.numeroFim,
      );
      if (!reservation)
        throw new Error(
          'As senhas reservadas acabaram. Conecte o totem à internet para continuar.',
        );
      const sessionId = getSessionId();
      const queued = await consumeNumberAndQueue({
        sessaoId: sessionId,
        totemId,
        reservaId: reservation.id,
        itens: items.map(({ corte, quantidade, unidadeMedida }) => ({
          corteId: corte.id,
          quantidade,
          unidadeMedida,
        })),
      });
      setOfflineSessionId(queued.sessaoId);
      setPedido({
        total: items.reduce((sum, item) => sum + subtotal(item), 0).toFixed(2),
        senha: { numeroSequencial: queued.numeroSequencial },
        sincronizacaoPendente: true,
      });
      setTela('confirmacao');
      setItems([]);
      await refreshPendingCount();
      if (navigator.onLine) {
        try {
          const confirmed = await api.sincronizarPedido(queued);
          await removePendingOrder(queued.sessaoId);
          setPedido(confirmed);
          await refreshPendingCount();
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Pedido aguardando sincronização.';
          await markPendingOrderError(queued.sessaoId, message);
          await refreshPendingCount();
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível salvar o pedido neste totem.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function novoPedido() {
    sessionStorage.removeItem('ao-ponto-sessao');
    setPedido(null);
    setOfflineSessionId(null);
    setTela('catalogo');
    void carregarCortes();
  }

  if (tela === 'confirmacao' && pedido)
    return (
      <div className="app-shell">
        <Confirmation pedido={pedido} onNewOrder={novoPedido} />
        <Footer />
      </div>
    );
  const count = items.length;
  return (
    <div className="app-shell">
      <Header
        count={count}
        onCart={() => {
          setTela('carrinho');
          setError('');
        }}
      />
      <main className="main-content">
        {!online && (
          <div className="error-banner" role="status">
            Modo offline: pedidos serão sincronizados quando a conexão voltar.
          </div>
        )}
        {pendingCount > 0 && (
          <div className="error-banner" role="status">
            {pendingCount}{' '}
            {pendingCount === 1
              ? 'pedido aguardando sincronização'
              : 'pedidos aguardando sincronização'}
            .
          </div>
        )}
        {tela === 'catalogo' ? (
          loading ? (
            <div className="loading-state">
              <span className="spinner" />
              <p>Carregando cortes...</p>
            </div>
          ) : error && !cortes.length ? (
            <div className="error-state">
              <AlertCircle size={30} />
              <h2>Ops, algo deu errado</h2>
              <p>{error}</p>
              <button
                className="button-primary"
                onClick={() => void carregarCortes()}
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <Catalog cortes={cortes} addItem={addItem} />
          )
        ) : (
          <Cart
            items={items}
            update={updateItem}
            remove={removeItem}
            onBack={() => {
              setTela('catalogo');
              setError('');
            }}
            onConfirm={() => void confirmarPedido()}
            loading={submitting}
          />
        )}
        {tela === 'catalogo' && !loading && cortes.length > 0 && (
          <button className="floating-cart" onClick={() => setTela('carrinho')}>
            <ShoppingBag size={17} /> Ver meu pedido
            {count ? ` (${count} ${count === 1 ? 'item' : 'itens'})` : ''}
          </button>
        )}
        {error && (tela === 'carrinho' || cortes.length > 0) && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} />
            {error}
            <button onClick={() => setError('')} aria-label="Fechar mensagem">
              ×
            </button>
          </div>
        )}
      </main>
      <Footer order={tela === 'carrinho'} />
    </div>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  if (path === '/atendimento') return <Atendimento />;
  if (path === '/painel') return <Painel />;
  if (path === '/cortes/novo') return <CriarCorte />;
  return <TotemApp />;
}
