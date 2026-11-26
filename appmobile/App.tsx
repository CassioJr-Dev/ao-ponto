import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api, categoria, dinheiro, imagem, senha, subtotal } from './src/api';
import type { Corte, Fila, ItemCarrinho, Painel, PedidoResponse, Ticket, UnidadeMedida } from './src/types';

type Tab = 'catalogo' | 'atendimento' | 'painel' | 'cortes';
const RED = '#bd1018';
const units: { value: UnidadeMedida; label: string }[] = [{ value: 'KG', label: 'Quilogramas (kg)' }, { value: 'GRAMA', label: 'Gramas (g)' }, { value: 'PECA', label: 'Peças' }, { value: 'FATIA', label: 'Fatias' }];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function novoUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const random = Math.floor(Math.random() * 16);
    return (c === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function obterUuidPersistido(key: string) {
  const stored = await AsyncStorage.getItem(key);
  if (stored && UUID_PATTERN.test(stored)) return stored;
  const id = novoUuid();
  await AsyncStorage.setItem(key, id);
  return id;
}

function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary, disabled && { opacity: .5 }]}><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{title}</Text></Pressable>;
}
function Field({ label, value, onChangeText, placeholder, keyboardType, multiline = false }: any) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} multiline={multiline} style={[styles.input, multiline && { minHeight: 70, textAlignVertical: 'top' }]} placeholderTextColor="#a5a5a5" /></View>;
}
function Header({ subtitle, count, onCart }: { subtitle: string; count?: number; onCart?: () => void }) {
  return <View style={styles.header}><Image source={require('./assets/ao-ponto-logo.png')} style={styles.brandIcon} resizeMode="cover" /><View style={{ flex: 1 }}><Text style={styles.brand}>AoPonto</Text><Text style={styles.brandSub}>{subtitle}</Text></View>{count !== undefined && <Pressable style={styles.bag} onPress={onCart}><Text style={{ color: RED, fontWeight: '800' }}>Pedido · {count}</Text></Pressable>}</View>;
}
function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <View style={[styles.notice, error ? styles.noticeError : styles.noticeSuccess]}><Text style={{ color: error ? '#9b1c22' : '#176b38', lineHeight: 20 }}>{text}</Text></View>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('catalogo');
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Corte | null>(null);
  const [quantidade, setQuantidade] = useState('0,500');
  const [unidade, setUnidade] = useState<UnidadeMedida>('KG');
  const [filtro, setFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pedido, setPedido] = useState<PedidoResponse | null>(null);
  const [fila, setFila] = useState<Fila | null>(null);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [queueTab, setQueueTab] = useState<'PENDENTES' | 'EM_ATENDIMENTO' | 'CONCLUIDOS'>('PENDENTES');
  const [corteFiltro, setCorteFiltro] = useState('');
  const [ticketDetalhe, setTicketDetalhe] = useState<Ticket | null>(null);
  const [gerencia, setGerencia] = useState<Corte[]>([]);
  const [editor, setEditor] = useState<Corte | null | false>(false);
  const [formNome, setFormNome] = useState('');
  const [formImagem, setFormImagem] = useState('');
  const [formPreco, setFormPreco] = useState('');
  const [formDisponivel, setFormDisponivel] = useState(true);
  const [now, setNow] = useState(new Date());

  const carregarCatalogo = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    let cortesApi: Corte[] | null = null;
    try {
      cortesApi = await api.listarCortes();
      setCortes(cortesApi);
      const rawReservation = await AsyncStorage.getItem('@ao-ponto/reserva');
      let reservation = rawReservation ? JSON.parse(rawReservation) : null;
      if (!reservation || reservation.nextNumber > reservation.numeroFim) {
        const totemId = await obterUuidPersistido('@ao-ponto/totem-id');
        const reservaId = await obterUuidPersistido('@ao-ponto/reserva-id-pendente');
        reservation = await api.reservar(totemId, reservaId);
        reservation.nextNumber = reservation.numeroInicio;
        await AsyncStorage.setItem('@ao-ponto/reserva', JSON.stringify(reservation));
        await AsyncStorage.removeItem('@ao-ponto/reserva-id-pendente');
      }
    } catch (e) {
      if (cortesApi) {
        // The live catalog is already visible; a reservation refresh can retry at checkout.
        setError('');
      } else {
        const rawReservation = await AsyncStorage.getItem('@ao-ponto/reserva');
        const cached = rawReservation ? JSON.parse(rawReservation) : null;
        const cachedCuts: Corte[] = cached?.catalogo?.filter((c: Corte) => c.disponivel) ?? [];
        if (cached && cached.nextNumber <= cached.numeroFim && cachedCuts.length) {
          setCortes(cachedCuts); setError('');
        } else {
          setError((e as Error).message);
        }
      }
    }
    finally { if (!quiet) setLoading(false); }
  }, []);
  const carregarFila = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { setFila(await api.fila()); setError(''); } catch (e) { setError((e as Error).message); }
    finally { if (!quiet) setLoading(false); }
  }, []);
  const carregarPainel = useCallback(async () => {
    try { setPainel(await api.painel()); setError(''); } catch (e) { setError((e as Error).message); }
  }, []);
  const carregarGerencia = useCallback(async () => {
    setLoading(true); try { setGerencia(await api.listarTodosCortes()); setError(''); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void carregarCatalogo(); }, [carregarCatalogo]);
  useEffect(() => {
    if (tab !== 'catalogo') return;
    const interval = setInterval(() => void carregarCatalogo(true), 3000);
    return () => clearInterval(interval);
  }, [tab, carregarCatalogo]);
  useEffect(() => {
    if (tab !== 'atendimento') return;
    void carregarFila(); const id = setInterval(() => void carregarFila(true), 3000); return () => clearInterval(id);
  }, [tab, carregarFila]);
  useEffect(() => {
    if (tab !== 'painel') return;
    void carregarPainel(); const id = setInterval(() => void carregarPainel(), 3000); const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(id); clearInterval(clock); };
  }, [tab, carregarPainel]);
  useEffect(() => { if (tab === 'cortes') void carregarGerencia(); }, [tab, carregarGerencia]);
  useEffect(() => {
    const sincronizarPendentes = async () => {
      for (const key of (await AsyncStorage.getAllKeys()).filter(k => k.startsWith('@ao-ponto/pedido-pendente/'))) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;
          const confirmado = await api.sincronizar(JSON.parse(raw));
          await AsyncStorage.removeItem(key);
          setPedido(atual => atual?.senha.numeroSequencial === confirmado.senha.numeroSequencial ? confirmado : atual);
        } catch { /* Retenta no próximo intervalo, como o totem web. */ }
      }
    };
    void sincronizarPendentes();
    const timer = setInterval(() => void sincronizarPendentes(), 15000);
    return () => clearInterval(timer);
  }, []);

  const filtrados = useMemo(() => cortes.filter(c => c.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) && (filtro === 'Todos' || categoria(c.nome) === filtro)), [cortes, busca, filtro]);
  const atual = fila?.emAtendimento ?? null;
  const ticketList = queueTab === 'PENDENTES' ? fila?.pendentes ?? [] : queueTab === 'EM_ATENDIMENTO' ? atual ? [atual] : [] : fila?.concluidos ?? [];
  const corteOptions = [...new Set([...(fila?.pendentes ?? []), ...(atual ? [atual] : [])].flatMap(t => t.pedido.itensPedido.map(i => i.corte.nome)))].sort();
  const ticketFiltered = ticketList.filter(t => !corteFiltro || t.pedido.itensPedido.some(i => i.corte.nome === corteFiltro));
  const totalCarrinho = carrinho.reduce((sum, item) => sum + subtotal(item.quantidade, item.unidadeMedida, item.corte.precoKg), 0);

  function addItem() {
    if (!selecionado) return;
    const amount = Number(quantidade.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) { setError('Informe uma quantidade válida.'); return; }
    setCarrinho(old => [...old, { corte: selecionado, quantidade: amount, unidadeMedida: unidade }]);
    setSelecionado(null); setError('');
  }
  async function enviarPedido() {
    if (!carrinho.length) { setError('Adicione pelo menos um corte ao pedido.'); return; }
    setBusy(true); setError('');
    try {
      const reservationRaw = await AsyncStorage.getItem('@ao-ponto/reserva');
      let reservation = reservationRaw ? JSON.parse(reservationRaw) : null;
      const catalogoReservado: Corte[] = reservation?.catalogo?.filter((c: Corte) => c.disponivel) ?? [];
      const pedidoTemCorteForaDaReserva = carrinho.some(item => !catalogoReservado.some(c => c.id === item.corte.id));
      if (!reservation || reservation.nextNumber > reservation.numeroFim || pedidoTemCorteForaDaReserva) {
        const totemId = await obterUuidPersistido('@ao-ponto/totem-id');
        const reservaId = await obterUuidPersistido('@ao-ponto/reserva-id-pendente');
        reservation = await api.reservar(totemId, reservaId);
        reservation.nextNumber = reservation.numeroInicio;
        await AsyncStorage.removeItem('@ao-ponto/reserva-id-pendente');
      }
      const totemId = await obterUuidPersistido('@ao-ponto/totem-id');
      const seq = reservation.nextNumber++;
      await AsyncStorage.setItem('@ao-ponto/reserva', JSON.stringify(reservation));
      const sessaoId = novoUuid();
      const order = { sessaoId, totemId, reservaId: reservation.id, numeroSequencial: seq, itens: carrinho.map(i => ({ corteId: i.corte.id, quantidade: i.quantidade, unidadeMedida: i.unidadeMedida })) };
      const localConfirmation: PedidoResponse = { total: totalCarrinho.toFixed(2), senha: { numeroSequencial: seq }, sincronizacaoPendente: true };
      await AsyncStorage.setItem(`@ao-ponto/pedido-pendente/${sessaoId}`, JSON.stringify(order));
      setPedido(localConfirmation); setCartOpen(false); setCarrinho([]); setTab('catalogo');
      try {
        const result = await api.sincronizar(order);
        await AsyncStorage.removeItem(`@ao-ponto/pedido-pendente/${sessaoId}`); setPedido(result);
      } catch { /* persisted for retry */ }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function executar(acao: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await acao(); await carregarFila(true); } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  function abrirEditor(corte?: Corte) {
    setError(''); setEditor(corte ?? null); setFormNome(corte?.nome ?? ''); setFormImagem(corte?.imagemUrl ?? ''); setFormPreco(corte?.precoKg ?? ''); setFormDisponivel(corte?.disponivel ?? true);
  }
  async function salvarCorte() {
    if (!formNome.trim() || !formPreco.trim()) { setError('Preencha o nome e o preço por quilograma.'); return; }
    setBusy(true); setError('');
    try {
      const data = { nome: formNome.trim(), imagemUrl: formImagem.trim(), precoKg: formPreco.replace(',', '.').trim(), disponivel: formDisponivel };
      if (editor) await api.atualizarCorte(editor.id, data); else await api.criarCorte(data);
      setEditor(false); await carregarGerencia();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  function excluir(corte: Corte) {
    Alert.alert(`Excluir ${corte.nome}?`, 'Essa ação remove o corte do catálogo. Cortes associados a pedidos não podem ser excluídos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir corte', style: 'destructive', onPress: () => { void (async () => { setBusy(true); try { await api.excluirCorte(corte.id); setGerencia(old => old.filter(x => x.id !== corte.id)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } })(); } },
    ]);
  }

  const tabs: { key: Tab; title: string; icon: string }[] = [{ key: 'catalogo', title: 'Catálogo', icon: '▦' }, { key: 'atendimento', title: 'Atendimento', icon: '◷' }, { key: 'painel', title: 'Painel', icon: '▣' }, { key: 'cortes', title: 'Cortes', icon: '✂' }];
  return <SafeAreaProvider><SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}><StatusBar barStyle="dark-content" />
    <Header subtitle={tab === 'catalogo' ? 'Seu pedido, do seu jeito.' : tab === 'atendimento' ? 'Atendimento' : tab === 'painel' ? 'Painel de senhas' : 'Gerenciar cortes'} count={tab === 'catalogo' ? carrinho.length : undefined} onCart={() => setCartOpen(true)} />
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => tab === 'catalogo' ? void carregarCatalogo() : tab === 'atendimento' ? void carregarFila() : tab === 'painel' ? void carregarPainel() : void carregarGerencia()} tintColor={RED} />}>
      {error ? <Notice text={error} error /> : null}
      {tab === 'catalogo' && <>
        {pedido ? <View style={styles.confirmBox}><Text style={styles.eyebrow}>{pedido.sincronizacaoPendente ? 'Salvo neste aparelho' : 'Tudo certo!'}</Text><Text style={styles.heading}>{pedido.sincronizacaoPendente ? 'Pedido aguardando sincronização' : 'Pedido confirmado!'}</Text><Text style={styles.muted}>Sua senha de atendimento é:</Text><Text style={styles.bigTicket}>{senha(pedido.senha.numeroSequencial)}</Text><Text style={styles.body}>{pedido.sincronizacaoPendente ? 'Seu pedido será enviado quando a conexão estiver disponível.' : `Seu pedido #${pedido.numeroPedido} já foi registrado. Aguarde ser chamado no painel.`}</Text><Button title="Fazer novo pedido" secondary onPress={() => setPedido(null)} /></View> : <>
          <Text style={styles.eyebrow}>Fresquinho pra você</Text><Text style={styles.heading}>Selecione o corte desejado</Text><Text style={styles.muted}>Toque em um corte para ver detalhes e adicionar ao pedido.</Text>
          <TextInput value={busca} onChangeText={setBusca} placeholder="⌕  Buscar corte..." placeholderTextColor="#999" style={[styles.input, { marginTop: 18 }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>{['Todos', 'Bovino', 'Suíno', 'Frango'].map(x => <Pressable key={x} onPress={() => setFiltro(x)} style={[styles.chip, filtro === x && styles.chipActive]}><Text style={[styles.chipText, filtro === x && styles.chipTextActive]}>{x}</Text></Pressable>)}</ScrollView>
          {loading && !cortes.length ? <ActivityIndicator color={RED} style={{ margin: 32 }} /> : <View style={styles.productGrid}>{filtrados.map(c => <Pressable key={c.id} style={styles.productCard} onPress={() => { setSelecionado(c); setQuantidade(unidade === 'KG' ? '0,500' : unidade === 'GRAMA' ? '500' : '1'); }}><Image source={{ uri: imagem(c.imagemUrl) }} style={styles.productImage} /><View style={styles.productInfo}><Text style={styles.productName}>{c.nome}</Text><Text style={styles.price}>{dinheiro(c.precoKg)} <Text style={styles.muted}>/ kg</Text></Text></View><Text style={styles.addMark}>＋</Text></Pressable>)}</View>}
          {!loading && !filtrados.length && <View style={styles.empty}><Text style={styles.heading}>Nenhum corte encontrado</Text><Text style={styles.muted}>Tente buscar com outro nome ou categoria.</Text></View>}
        </>}
      </>}

      {tab === 'atendimento' && <>
        <Text style={styles.eyebrow}>Pedidos do açougue</Text><Text style={styles.heading}>Fila de atendimento</Text>
        <Text style={styles.label}>Filtro por corte</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}><Pressable onPress={() => setCorteFiltro('')} style={[styles.chip, !corteFiltro && styles.chipActive]}><Text style={[styles.chipText, !corteFiltro && styles.chipTextActive]}>Todos</Text></Pressable>{corteOptions.map(x => <Pressable key={x} onPress={() => setCorteFiltro(x)} style={[styles.chip, corteFiltro === x && styles.chipActive]}><Text style={[styles.chipText, corteFiltro === x && styles.chipTextActive]}>{x}</Text></Pressable>)}</ScrollView>
        <View style={styles.queueTabs}>{([['PENDENTES', 'Pendentes', fila?.pendentes.length ?? 0], ['EM_ATENDIMENTO', 'Em atendimento', atual ? 1 : 0], ['CONCLUIDOS', 'Concluídos', fila?.concluidos.length ?? 0]] as const).map(([key, title, n]) => <Pressable key={key} onPress={() => setQueueTab(key)} style={[styles.queueTab, queueTab === key && styles.queueTabActive]}><Text style={[styles.queueTabText, queueTab === key && { color: RED }]}>{title} · {n}</Text></Pressable>)}</View>
        {loading && !fila ? <ActivityIndicator color={RED} style={{ margin: 30 }} /> : ticketFiltered.length ? ticketFiltered.map(t => <Pressable key={t.id} style={[styles.ticketCard, t.status === 'CHAMADA' && styles.ticketCurrent]} onPress={() => setTicketDetalhe(t)}><View style={styles.ticketNo}><Text style={styles.ticketCode}>{senha(t.numeroSequencial)}</Text><Text style={styles.smallMuted}>{new Date(t.ultimaChamada ?? t.dataGeracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View><View style={{ flex: 1 }}><Text style={styles.productName}>{t.pedido.itensPedido.map(i => i.corte.nome).join(', ')}</Text><Text style={styles.smallMuted}>Pedido #{t.pedido.numeroPedido} · {t.pedido.itensPedido.map(i => `${Number(i.quantidade).toLocaleString('pt-BR')} ${i.unidadeMedida.toLowerCase()}`).join(' · ')}</Text></View><Text style={styles.chevron}>›</Text></Pressable>) : <View style={styles.empty}><Text style={styles.successIcon}>✓</Text><Text style={styles.productName}>{queueTab === 'PENDENTES' ? 'Fila em dia' : 'Nenhum pedido nesta lista'}</Text><Text style={styles.smallMuted}>Os pedidos aparecerão aqui automaticamente.</Text></View>}
        {queueTab === 'PENDENTES' && <Button title="◖  Chamar próxima senha" onPress={() => void executar(api.chamarProxima)} disabled={busy || Boolean(atual) || !(fila?.pendentes.length)} />}
        {queueTab === 'EM_ATENDIMENTO' && <View style={styles.actionRow}><View style={{ flex: 1 }}><Button title="Reemitir chamada" secondary onPress={() => atual && void executar(() => api.rechamar(atual.pedidoId))} disabled={busy || !atual} /></View><View style={{ flex: 1 }}><Button title={atual ? `Concluir ${senha(atual.numeroSequencial)}` : 'Concluir pedido'} onPress={() => atual && void executar(() => api.concluir(atual.pedidoId))} disabled={busy || !atual} /></View></View>}
        <Text style={styles.footerNote}>AoPonto · Horário de funcionamento: 06:00 - 20:00</Text>
      </>}

      {tab === 'painel' && <>
        <View style={styles.clock}><Text style={styles.muted}>◷  {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>
        <View style={styles.currentPanel}><Text style={styles.eyebrow}>Senha atual</Text>{painel?.senhaAtual ? <><Text style={styles.panelTicket}>{senha(painel.senhaAtual.numeroSequencial)}</Text><Text style={styles.body}>Pedido #{painel.senhaAtual.pedido.numeroPedido}</Text></> : <Text style={styles.waiting}>Aguardando próxima senha</Text>}</View>
        <View style={styles.card}><Text style={styles.heading}>Últimas senhas chamadas</Text>{painel?.ultimasChamadas.length ? painel.ultimasChamadas.map(call => <View key={call.id} style={styles.historyRow}><Text style={styles.ticketCode}>{senha(call.senha.numeroSequencial)}</Text><Text style={[styles.body, { flex: 1 }]}>Pedido #{call.senha.pedido.numeroPedido}{call.reemissao ? ' · Rechamada' : ''}</Text><Text style={styles.smallMuted}>{new Date(call.dataChamada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>) : <Text style={styles.muted}>Nenhuma senha chamada ainda.</Text>}</View>
        <Text style={styles.footerNote}>AoPonto · Atendimento</Text>
      </>}

      {tab === 'cortes' && <>
        <View style={styles.rowBetween}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>Catálogo</Text><Text style={styles.heading}>Gerenciar cortes</Text></View><Pressable onPress={() => abrirEditor()} style={styles.addButton}><Text style={styles.addButtonText}>＋ Novo</Text></Pressable></View>
        <TextInput value={busca} onChangeText={setBusca} placeholder="⌕  Buscar corte..." placeholderTextColor="#999" style={styles.input} />
        {loading && !gerencia.length ? <ActivityIndicator color={RED} style={{ margin: 30 }} /> : gerencia.filter(c => c.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))).map(c => <View key={c.id} style={styles.managedCut}><Image source={{ uri: imagem(c.imagemUrl) }} style={styles.cutThumb} /><View style={{ flex: 1 }}><Text style={styles.productName}>{c.nome}</Text><Text style={styles.smallMuted}>{dinheiro(c.precoKg)} / kg</Text></View><Text style={[styles.statusPill, !c.disponivel && styles.statusOff]}>{c.disponivel ? 'Disponível' : 'Indisponível'}</Text><Pressable onPress={() => abrirEditor(c)} style={styles.iconAction}><Text>✎</Text></Pressable><Pressable onPress={() => excluir(c)} style={styles.iconAction}><Text style={{ color: RED }}>⌫</Text></Pressable></View>)}
        {!loading && !gerencia.length && <View style={styles.empty}><Text style={styles.productName}>Seu catálogo está vazio</Text><Button title="Adicionar corte" onPress={() => abrirEditor()} /></View>}
      </>}
    </ScrollView>

    <View style={styles.bottomNav}>{tabs.map(item => <Pressable key={item.key} onPress={() => { setTab(item.key); setError(''); if (item.key === 'catalogo') void carregarCatalogo(); }} style={styles.navItem}><Text style={[styles.navIcon, tab === item.key && { color: RED }]}>{item.icon}</Text><Text style={[styles.navLabel, tab === item.key && { color: RED, fontWeight: '800' }]}>{item.title}</Text></Pressable>)}</View>

    <Modal visible={Boolean(selecionado)} transparent animationType="slide" onRequestClose={() => setSelecionado(null)}><SafeAreaProvider><SafeAreaView style={styles.modalShade} edges={['bottom']}><ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: 28 }}><Pressable onPress={() => setSelecionado(null)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>{selecionado && <><Image source={{ uri: imagem(selecionado.imagemUrl) }} style={styles.modalImage} /><Text style={styles.eyebrow}>{categoria(selecionado.nome)}</Text><Text style={styles.heading}>{selecionado.nome}</Text><Text style={styles.modalPrice}>{dinheiro(selecionado.precoKg)} / kg</Text><Text style={styles.label}>Como deseja comprar?</Text><View style={styles.unitRow}>{units.map(u => <Pressable key={u.value} onPress={() => { setUnidade(u.value); setQuantidade(u.value === 'KG' ? '0,500' : u.value === 'GRAMA' ? '500' : '1'); }} style={[styles.unitButton, unidade === u.value && styles.unitButtonActive]}><Text style={[styles.unitText, unidade === u.value && { color: RED }]}>{u.value}</Text></Pressable>)}</View><Field label="Quantidade" value={quantidade} onChangeText={setQuantidade} keyboardType="decimal-pad" /><Button title="Adicionar ao pedido  ＋" onPress={addItem} /></>}</ScrollView></SafeAreaView></SafeAreaProvider></Modal>

    <Modal visible={cartOpen} animationType="slide" onRequestClose={() => setCartOpen(false)}><SafeAreaProvider><SafeAreaView edges={['top', 'bottom']} style={styles.safe}><Header subtitle="Meu pedido" count={carrinho.length} /><ScrollView style={styles.page} contentContainerStyle={styles.content}><Pressable onPress={() => setCartOpen(false)}><Text style={styles.backLink}>‹  Voltar ao catálogo</Text></Pressable><Text style={styles.heading}>Meu pedido</Text>{carrinho.length ? <>{carrinho.map((item, index) => <View key={`${item.corte.id}-${index}`} style={styles.cartItem}><Image source={{ uri: imagem(item.corte.imagemUrl) }} style={styles.cutThumb} /><View style={{ flex: 1 }}><Text style={styles.productName}>{item.corte.nome}</Text><Text style={styles.smallMuted}>{item.quantidade.toLocaleString('pt-BR')} {item.unidadeMedida.toLowerCase()}</Text><Text style={styles.price}>{dinheiro(subtotal(item.quantidade, item.unidadeMedida, item.corte.precoKg))}</Text></View><View><Pressable style={styles.stepper} onPress={() => setCarrinho(old => old.map((x, i) => i === index ? { ...x, quantidade: Number((x.quantidade + (x.unidadeMedida === 'KG' ? .1 : 1)).toFixed(3)) } : x))}><Text style={styles.stepText}>＋</Text></Pressable><Pressable style={styles.stepper} onPress={() => setCarrinho(old => old.map((x, i) => i === index ? { ...x, quantidade: Math.max(x.unidadeMedida === 'KG' ? .001 : 1, Number((x.quantidade - (x.unidadeMedida === 'KG' ? .1 : 1)).toFixed(3))) } : x))}><Text style={styles.stepText}>−</Text></Pressable><Pressable onPress={() => setCarrinho(old => old.filter((_, i) => i !== index))}><Text style={{ color: RED, textAlign: 'center', padding: 7 }}>Remover</Text></Pressable></View></View>)}<View style={styles.totalRow}><Text style={styles.body}>Total do pedido</Text><Text style={styles.total}>{dinheiro(totalCarrinho)}</Text></View><View style={styles.pickup}><Text style={{ color: '#237a42', fontWeight: '800' }}>✓  Desejo escolher minha peça no balcão</Text><Text style={styles.smallMuted}>Você pode escolher sua peça diretamente com o atendente.</Text></View><Button title={busy ? 'Registrando pedido...' : '✓  Confirmar pedido'} onPress={() => void enviarPedido()} disabled={busy} /><View style={{ height: 12 }} /><Button title="Continuar comprando" secondary onPress={() => setCartOpen(false)} /></> : <View style={styles.empty}><Text style={styles.heading}>Seu pedido está vazio</Text><Button title="Ver cortes" onPress={() => setCartOpen(false)} /></View>}</ScrollView></SafeAreaView></SafeAreaProvider></Modal>

    <Modal visible={editor !== false} transparent animationType="slide" onRequestClose={() => setEditor(false)}><SafeAreaProvider><SafeAreaView style={styles.modalShade} edges={['bottom']}><ScrollView style={styles.modalSheet} contentContainerStyle={{ paddingBottom: 30 }}><Pressable onPress={() => setEditor(false)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable><Text style={styles.eyebrow}>Catálogo</Text><Text style={styles.heading}>{editor ? 'Editar corte' : 'Adicionar corte'}</Text><Field label="Nome do corte" value={formNome} onChangeText={setFormNome} placeholder="Ex.: Alcatra" /><Field label="URL da imagem (opcional)" value={formImagem} onChangeText={setFormImagem} placeholder="/imgs/alcatra.png" /><Field label="Preço por quilograma (R$)" value={formPreco} onChangeText={setFormPreco} placeholder="0,00" keyboardType="decimal-pad" /><View style={styles.switchRow}><View style={{ flex: 1 }}><Text style={styles.label}>Disponível para venda</Text><Text style={styles.smallMuted}>Exibir este corte no catálogo.</Text></View><Switch value={formDisponivel} onValueChange={setFormDisponivel} trackColor={{ true: '#d98b8f' }} thumbColor={formDisponivel ? RED : '#f4f3f4'} /></View><Button title={busy ? 'Salvando...' : editor ? 'Salvar alterações' : 'Cadastrar corte'} onPress={() => void salvarCorte()} disabled={busy} /></ScrollView></SafeAreaView></SafeAreaProvider></Modal>

    <Modal visible={Boolean(ticketDetalhe)} transparent animationType="fade" onRequestClose={() => setTicketDetalhe(null)}><SafeAreaProvider><SafeAreaView style={styles.modalShade} edges={['top', 'bottom']}><View style={styles.detailSheet}><Pressable onPress={() => setTicketDetalhe(null)} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>{ticketDetalhe && <><Text style={styles.eyebrow}>Detalhes do pedido</Text><Text style={styles.heading}>Pedido #{ticketDetalhe.pedido.numeroPedido}</Text><View style={styles.detailMeta}><Text style={styles.ticketCode}>{senha(ticketDetalhe.numeroSequencial)}</Text><Text style={styles.statusPill}>{ticketDetalhe.status === 'CHAMADA' ? 'Em atendimento' : ticketDetalhe.status === 'FINALIZADA' ? 'Concluído' : 'Pendente'}</Text></View><Text style={[styles.label, { marginTop: 18 }]}>Itens do pedido</Text>{ticketDetalhe.pedido.itensPedido.map(item => <View key={item.id} style={styles.historyRow}><View style={{ flex: 1 }}><Text style={styles.productName}>{item.corte.nome}</Text><Text style={styles.smallMuted}>{Number(item.quantidade).toLocaleString('pt-BR')} {item.unidadeMedida.toLowerCase()}</Text></View><Text style={styles.body}>{dinheiro(item.subtotal)}</Text></View>)}<View style={styles.totalRow}><Text style={styles.body}>Total</Text><Text style={styles.total}>{dinheiro(ticketDetalhe.pedido.total)}</Text></View></>}</View></SafeAreaView></SafeAreaProvider></Modal>
  </SafeAreaView></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f7f7f7' }, page: { flex: 1 }, content: { padding: 18, paddingBottom: 28 },
  header: { height: 72, backgroundColor: RED, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10 }, brandIcon: { height: 40, width: 40, borderRadius: 20, backgroundColor: RED, overflow: 'hidden' }, brand: { color: '#fff', fontWeight: '900', fontSize: 21, letterSpacing: -.7 }, brandSub: { color: '#f7dfe0', fontSize: 11, marginTop: 1 }, bag: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8 },
  eyebrow: { color: RED, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 }, heading: { color: '#252525', fontSize: 23, fontWeight: '800', letterSpacing: -.5, marginBottom: 6 }, muted: { color: '#777', fontSize: 13, lineHeight: 20 }, body: { color: '#454545', fontSize: 14, lineHeight: 20 }, smallMuted: { color: '#777', fontSize: 11, lineHeight: 16 }, label: { color: '#333', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 13 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e4e2', borderRadius: 11, minHeight: 46, paddingHorizontal: 13, color: '#252525', fontSize: 14 }, field: { marginTop: 12 }, button: { minHeight: 47, backgroundColor: RED, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 13 }, buttonText: { color: '#fff', fontSize: 14, fontWeight: '800' }, buttonSecondary: { backgroundColor: '#fff', borderColor: '#d9b3b5', borderWidth: 1 }, buttonTextSecondary: { color: '#8d3437' }, notice: { borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1 }, noticeError: { backgroundColor: '#fff2f2', borderColor: '#f0c4c5' }, noticeSuccess: { backgroundColor: '#f0faf3', borderColor: '#b8e2c6' },
  filters: { flexGrow: 0, marginTop: 13, marginBottom: 14 }, chip: { borderColor: '#e7e3e1', borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 15, marginRight: 8, backgroundColor: '#fff' }, chipActive: { borderColor: RED, backgroundColor: '#fff4f4' }, chipText: { color: '#666', fontWeight: '600', fontSize: 12 }, chipTextActive: { color: RED, fontWeight: '800' }, productGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 11 }, productCard: { width: '48%', backgroundColor: '#fff', borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: '#efedeb', elevation: 1 }, productImage: { width: '100%', height: 125, backgroundColor: '#f1eeea' }, productInfo: { padding: 11 }, productName: { color: '#292929', fontSize: 14, fontWeight: '800', marginBottom: 4 }, price: { color: RED, fontSize: 14, fontWeight: '800' }, addMark: { position: 'absolute', right: 9, top: 9, width: 29, height: 29, borderRadius: 16, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: RED, backgroundColor: '#fff', fontWeight: '900', fontSize: 19 }, empty: { alignItems: 'center', justifyContent: 'center', padding: 30, gap: 8 },
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 7, paddingBottom: 5 }, navItem: { flex: 1, alignItems: 'center', gap: 2 }, navIcon: { color: '#888', fontSize: 19 }, navLabel: { color: '#777', fontSize: 10 },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' }, modalSheet: { maxHeight: '92%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }, close: { alignSelf: 'flex-end', width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f4', borderRadius: 20, marginBottom: 10 }, closeText: { fontSize: 25, color: '#555', lineHeight: 28 }, modalImage: { width: '100%', height: 190, borderRadius: 13, marginBottom: 18, backgroundColor: '#eee' }, modalPrice: { color: RED, fontSize: 20, fontWeight: '900', marginVertical: 8 }, unitRow: { flexDirection: 'row', gap: 8, marginTop: 4 }, unitButton: { flex: 1, borderWidth: 1, borderColor: '#e6e3e1', borderRadius: 9, alignItems: 'center', paddingVertical: 11 }, unitButtonActive: { borderColor: RED, backgroundColor: '#fff5f5' }, unitText: { fontSize: 12, fontWeight: '800', color: '#666' },
  cartItem: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }, cutThumb: { width: 55, height: 55, borderRadius: 8, backgroundColor: '#eee' }, stepper: { width: 32, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#fff5f5', marginBottom: 4 }, stepText: { color: RED, fontSize: 18, fontWeight: '800' }, totalRow: { borderTopWidth: 1, borderColor: '#eee', paddingTop: 15, marginTop: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, total: { fontSize: 20, color: RED, fontWeight: '900' }, pickup: { backgroundColor: '#f5faf6', padding: 13, borderRadius: 10, marginTop: 14, gap: 5 }, confirmBox: { backgroundColor: '#fff', borderRadius: 16, padding: 22, alignItems: 'center', marginTop: 15 }, bigTicket: { color: RED, fontSize: 56, fontWeight: '900', marginVertical: 14 }, successIcon: { color: '#159447', fontSize: 30, fontWeight: '900' }, backLink: { color: RED, fontWeight: '700', paddingVertical: 8 },
  queueTabs: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, marginVertical: 14, padding: 3 }, queueTab: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }, queueTabActive: { backgroundColor: '#fff1f1' }, queueTabText: { fontSize: 10, fontWeight: '700', color: '#777' }, ticketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 11, borderWidth: 1, borderColor: '#eee', padding: 12, gap: 11, marginBottom: 9 }, ticketCurrent: { borderColor: '#ce7478', backgroundColor: '#fffafa' }, ticketNo: { alignItems: 'center', minWidth: 52 }, ticketCode: { color: RED, fontSize: 18, fontWeight: '900' }, chevron: { fontSize: 27, color: '#aaa' }, actionRow: { flexDirection: 'row', gap: 8 }, footerNote: { color: '#888', textAlign: 'center', fontSize: 11, marginTop: 24, marginBottom: 15 },
  clock: { alignItems: 'flex-end', marginBottom: 12 }, currentPanel: { backgroundColor: '#fff', alignItems: 'center', padding: 28, borderRadius: 16, borderWidth: 1, borderColor: '#eee', marginBottom: 18 }, panelTicket: { color: RED, fontWeight: '900', fontSize: 64, marginVertical: 12 }, waiting: { fontSize: 19, color: '#777', paddingVertical: 18 }, card: { backgroundColor: '#fff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#eee' }, historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomColor: '#eee', borderBottomWidth: 1, gap: 10 }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, addButton: { backgroundColor: RED, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 9 }, addButtonText: { color: '#fff', fontWeight: '800' }, managedCut: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 8, marginTop: 8 }, statusPill: { borderRadius: 15, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#e9f7ed', color: '#237a42', overflow: 'hidden', fontSize: 10, fontWeight: '700' }, statusOff: { backgroundColor: '#f2f2f2', color: '#777' }, iconAction: { width: 31, height: 32, borderWidth: 1, borderColor: '#f0d7d8', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', borderRadius: 10, padding: 12, marginTop: 15 }, detailSheet: { backgroundColor: '#fff', borderRadius: 18, margin: 20, padding: 20 }, detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
});
