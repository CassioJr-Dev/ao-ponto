import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { Corte } from '../types';
import { formatarMoeda, imagemFallback } from '../utils';

type DadosCorte = Pick<Corte, 'nome' | 'imagemUrl' | 'precoKg' | 'disponivel'>;

const formularioVazio: DadosCorte = {
  nome: '',
  imagemUrl: '',
  precoKg: '',
  disponivel: true,
};

export function GerenciarCortes() {
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Corte | null>(null);
  const [removendo, setRemovendo] = useState<Corte | null>(null);
  const [dados, setDados] = useState<DadosCorte>(formularioVazio);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setCortes(await api.listarCortesGerenciamento());
      setErro('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar os cortes.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!dialogAberto && !removendo) return;
    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !salvando) {
        setDialogAberto(false);
        setRemovendo(null);
      }
    }
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [dialogAberto, removendo, salvando]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return cortes.filter((corte) =>
      corte.nome.toLocaleLowerCase('pt-BR').includes(termo),
    );
  }, [busca, cortes]);

  function abrirNovo() {
    setEditando(null);
    setDados(formularioVazio);
    setErro('');
    setDialogAberto(true);
  }

  function abrirEdicao(corte: Corte) {
    setEditando(corte);
    setDados({
      nome: corte.nome,
      imagemUrl: corte.imagemUrl,
      precoKg: corte.precoKg,
      disponivel: corte.disponivel,
    });
    setErro('');
    setDialogAberto(true);
  }

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    const payload = {
      ...dados,
      nome: dados.nome.trim(),
      imagemUrl: dados.imagemUrl.trim(),
      precoKg: dados.precoKg.replace(',', '.').trim(),
    };
    try {
      if (editando) {
        const atualizado = await api.atualizarCorte(editando.id, payload);
        setCortes((atual) =>
          atual.map((corte) => (corte.id === atualizado.id ? atualizado : corte)),
        );
      } else {
        const criado = await api.criarCorteGerenciamento(payload);
        setCortes((atual) => [...atual, criado].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      }
      setDialogAberto(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o corte.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!removendo) return;
    setSalvando(true);
    setErro('');
    try {
      await api.deletarCorte(removendo.id);
      setCortes((atual) => atual.filter((corte) => corte.id !== removendo.id));
      setRemovendo(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir o corte.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="operations-shell cuts-manager">
      <header className="operations-header cuts-manager-header">
        <a className="icon-button" href="/" aria-label="Voltar ao início">
          <ArrowLeft size={20} />
        </a>
        <h1>Gerenciamento de cortes</h1>
        <button className="icon-button" onClick={abrirNovo} aria-label="Adicionar corte">
          <Plus size={21} />
        </button>
      </header>

      <section className="cuts-manager-content">
        <label className="cuts-search">
          <Search size={17} />
          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar corte..."
            aria-label="Buscar corte"
          />
          {busca && (
            <button onClick={() => setBusca('')} aria-label="Limpar busca">
              <X size={15} />
            </button>
          )}
        </label>

        {erro && !dialogAberto && (
          <div className="operations-error" role="alert">
            <AlertCircle size={17} />
            {erro}
            <button className="cuts-dismiss-error" onClick={() => setErro('')} aria-label="Fechar mensagem">
              <X size={16} />
            </button>
          </div>
        )}

        {carregando ? (
          <div className="cuts-manager-state"><span className="spinner" /><p>Carregando cortes...</p></div>
        ) : filtrados.length ? (
          <div className="cuts-manager-list" aria-live="polite">
            {filtrados.map((corte) => (
              <article className="managed-cut" key={corte.id}>
                <img src={imagemFallback(corte)} alt={corte.nome} loading="lazy" />
                <div className="managed-cut-info">
                  <strong>{corte.nome}</strong>
                  <small>{formatarMoeda(corte.precoKg)} / kg</small>
                </div>
                <span className={`managed-cut-status${corte.disponivel ? '' : ' is-unavailable'}`}>
                  {corte.disponivel ? 'Ativo' : 'Inativo'}
                </span>
                <button
                  className="managed-cut-action"
                  onClick={() => abrirEdicao(corte)}
                  aria-label={`Editar ${corte.nome}`}
                  title="Editar corte"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="managed-cut-action is-delete"
                  onClick={() => { setErro(''); setRemovendo(corte); }}
                  aria-label={`Excluir ${corte.nome}`}
                  title="Excluir corte"
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="cuts-manager-state">
            <ImagePlus size={28} />
            <strong>{busca ? 'Nenhum corte encontrado' : 'Seu catálogo está vazio'}</strong>
            <p>{busca ? 'Tente buscar usando outro nome.' : 'Adicione o primeiro corte para começar.'}</p>
            {!busca && <button className="button-primary" onClick={abrirNovo}><Plus size={16} /> Adicionar corte</button>}
          </div>
        )}
      </section>

      {dialogAberto && (
        <div className="cuts-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !salvando && setDialogAberto(false)}>
          <section className="cuts-dialog" role="dialog" aria-modal="true" aria-labelledby="cut-form-title">
            <header className="cuts-dialog-header">
              <div>
                <p className="operations-eyebrow">Catálogo</p>
                <h2 id="cut-form-title">{editando ? 'Editar corte' : 'Adicionar corte'}</h2>
              </div>
              <button className="cuts-dialog-close" onClick={() => setDialogAberto(false)} aria-label="Fechar" disabled={salvando}><X size={20} /></button>
            </header>
            <form className="cuts-manager-form" onSubmit={(event) => void salvar(event)}>
              <label>Nome do corte
                <input value={dados.nome} onChange={(event) => setDados({ ...dados, nome: event.target.value })} maxLength={120} placeholder="Ex.: Alcatra" required />
              </label>
              <label>URL da imagem (opcional)
                <input type="text" value={dados.imagemUrl} onChange={(event) => setDados({ ...dados, imagemUrl: event.target.value })} maxLength={2048} placeholder="/imgs/alcatra.png ou https://exemplo.com/imagem.jpg" />
              </label>
              <label>Preço por quilograma
                <span className="cut-price-field"><span>R$</span><input type="text" inputMode="decimal" value={dados.precoKg} onChange={(event) => setDados({ ...dados, precoKg: event.target.value.replace(/[^\d.,]/g, '') })} placeholder="0,00" required /><small>/ kg</small></span>
              </label>
              <label className="cut-availability">
                <input type="checkbox" checked={dados.disponivel} onChange={(event) => setDados({ ...dados, disponivel: event.target.checked })} />
                <span><strong>Disponível para venda</strong><small>Exibir este corte no catálogo do totem.</small></span>
              </label>
              {erro && <div className="operations-error" role="alert"><AlertCircle size={17} />{erro}</div>}
              <button className="button-primary cuts-save-button" disabled={salvando}>
                {salvando ? <span className="spinner" /> : <Check size={17} />}
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar corte'}
              </button>
            </form>
          </section>
        </div>
      )}

      {removendo && (
        <div className="cuts-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !salvando && setRemovendo(null)}>
          <section className="cuts-dialog cuts-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-cut-title">
            <button className="cuts-dialog-close" onClick={() => setRemovendo(null)} aria-label="Fechar" disabled={salvando}><X size={20} /></button>
            <span className="cuts-delete-icon"><Trash2 size={21} /></span>
            <h2 id="delete-cut-title">Excluir {removendo.nome}?</h2>
            <p>Essa ação remove o corte do catálogo. Cortes associados a pedidos não podem ser excluídos.</p>
            {erro && <div className="operations-error" role="alert"><AlertCircle size={17} />{erro}</div>}
            <div className="cuts-delete-actions">
              <button className="button-secondary" onClick={() => { setRemovendo(null); setErro(''); }} disabled={salvando}>Cancelar</button>
              <button className="cuts-confirm-delete" onClick={() => void excluir()} disabled={salvando}>{salvando ? 'Excluindo...' : 'Excluir corte'}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
