import type { Corte, UnidadeMedida } from '../types';

export interface Reservation {
  id: string;
  totemId: string;
  numeroInicio: number;
  numeroFim: number;
  catalogo: Corte[];
  nextNumber: number;
}

export interface OfflineOrder {
  sessaoId: string;
  totemId: string;
  reservaId: string;
  numeroSequencial: number;
  itens: {
    corteId: string;
    quantidade: number;
    unidadeMedida: UnidadeMedida;
  }[];
  criadoEm: number;
  erro?: string;
}

interface Setting {
  key: string;
  value: string;
}
const DB_NAME = 'ao-ponto-offline';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('reservations', { keyPath: 'id' });
      db.createObjectStore('orders', { keyPath: 'sessaoId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getTotemId(): Promise<string> {
  const db = await openDb();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');
  const row = (await requestResult(store.get('totemId'))) as
    Setting | undefined;
  const id = row?.value ?? crypto.randomUUID();
  if (!row) store.put({ key: 'totemId', value: id });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function getPendingReservationId(): Promise<string> {
  const db = await openDb();
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');
  const row = (await requestResult(store.get('pendingReservationId'))) as
    Setting | undefined;
  const id = row?.value ?? crypto.randomUUID();
  if (!row) store.put({ key: 'pendingReservationId', value: id });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return id;
}

export async function saveReservation(
  reservation: Omit<Reservation, 'nextNumber'>,
) {
  const db = await openDb();
  const tx = db.transaction(['reservations', 'settings'], 'readwrite');
  tx.objectStore('reservations').put({
    ...reservation,
    nextNumber: reservation.numeroInicio,
  });
  tx.objectStore('settings').delete('pendingReservationId');
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listReservations(): Promise<Reservation[]> {
  const db = await openDb();
  const rows = (await requestResult(
    db.transaction('reservations').objectStore('reservations').getAll(),
  )) as Reservation[];
  db.close();
  return rows.sort((a, b) => a.numeroInicio - b.numeroInicio);
}

export async function consumeNumberAndQueue(
  order: Omit<OfflineOrder, 'numeroSequencial' | 'criadoEm'>,
): Promise<OfflineOrder> {
  const db = await openDb();
  const tx = db.transaction(['reservations', 'orders'], 'readwrite');
  const reservations = tx.objectStore('reservations');
  const all = (await requestResult(reservations.getAll())) as Reservation[];
  const reservation = all
    .sort((a, b) => a.numeroInicio - b.numeroInicio)
    .find((item) => item.nextNumber <= item.numeroFim);
  if (!reservation) {
    tx.abort();
    db.close();
    throw new Error(
      'As senhas reservadas acabaram. Conecte o totem à internet para continuar.',
    );
  }
  const queued: OfflineOrder = {
    ...order,
    numeroSequencial: reservation.nextNumber,
    criadoEm: Date.now(),
  };
  reservations.put({ ...reservation, nextNumber: reservation.nextNumber + 1 });
  tx.objectStore('orders').put(queued);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return queued;
}

export async function listPendingOrders(): Promise<OfflineOrder[]> {
  const db = await openDb();
  const rows = (await requestResult(
    db.transaction('orders').objectStore('orders').getAll(),
  )) as OfflineOrder[];
  db.close();
  return rows.sort((a, b) => a.criadoEm - b.criadoEm);
}

export async function removePendingOrder(sessaoId: string) {
  const db = await openDb();
  const tx = db.transaction('orders', 'readwrite');
  tx.objectStore('orders').delete(sessaoId);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function markPendingOrderError(sessaoId: string, erro: string) {
  const db = await openDb();
  const tx = db.transaction('orders', 'readwrite');
  const store = tx.objectStore('orders');
  const row = (await requestResult(store.get(sessaoId))) as
    OfflineOrder | undefined;
  if (row) store.put({ ...row, erro });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
