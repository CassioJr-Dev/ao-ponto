import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, MapPin, Save } from 'lucide-react';
import { api } from '../services/api';
import type { Corte } from '../types';
import { Footer } from './Footer';

export function CriarCorte() {
  const [nome, setNome] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [precoKg, setPrecoKg] = useState('');
  const [disponivel, setDisponivel] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [corteCriado, setCorteCriado] = useState<Corte | null>(null);

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    setCorteCriado(null);

    try {
      const corte = await api.criarCorte({
        nome: nome.trim(),
        imagemUrl: imagemUrl.trim(),
        precoKg,
        disponivel,
      });
      setCorteCriado(corte);
      setNome('');
      setImagemUrl('');
      setPrecoKg('');
      setDisponivel(true);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível cadastrar o corte.',
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="app-shell cut-create-screen">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Voltar ao catálogo AoPonto">
          <span className="brand-mark">
            <MapPin size={23} strokeWidth={3} />
          </span>
          <span className="brand-copy">
            <strong>AoPonto</strong>
            <small>Cadastro de cortes</small>
          </span>
        </a>
      </header>

      <main className="cut-create-main">
        <a className="back-link" href="/">
          <span aria-hidden="true">←</span> Voltar ao catálogo
        </a>

        <section className="cut-create-card">
          <p className="eyebrow">Catálogo</p>
          <h1>Cadastrar novo corte</h1>
          <p className="cut-create-description">
            Informe os dados do corte para incluí-lo no catálogo do totem.
          </p>

          {corteCriado && (
            <div className="cut-create-success" role="status">
              <CheckCircle2 size={19} />
              <span>
                <strong>{corteCriado.nome} cadastrado.</strong>
                {corteCriado.disponivel
                  ? ' Já está disponível no catálogo.'
                  : ' Foi cadastrado como indisponível.'}
              </span>
            </div>
          )}

          <form className="cut-create-form" onSubmit={cadastrar}>
            <label>
              Nome do corte
              <input
                type="text"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                maxLength={120}
                placeholder="Ex.: Alcatra"
                autoComplete="off"
                required
              />
            </label>

            <label>
              URL da imagem
              <input
                type="url"
                value={imagemUrl}
                onChange={(event) => setImagemUrl(event.target.value)}
                maxLength={2048}
                placeholder="https://exemplo.com/imagens/corte.jpg"
                required
              />
            </label>

            <label>
              Preço por quilograma
              <span className="cut-price-field">
                <span>R$</span>
                <input
                  type="number"
                  value={precoKg}
                  onChange={(event) => setPrecoKg(event.target.value)}
                  min="0"
                  max="9999999999.99"
                  step="0.01"
                  placeholder="0,00"
                  inputMode="decimal"
                  required
                />
                <small>/ kg</small>
              </span>
            </label>

            <label className="cut-availability">
              <input
                type="checkbox"
                checked={disponivel}
                onChange={(event) => setDisponivel(event.target.checked)}
              />
              <span>
                <strong>Disponível para venda</strong>
                <small>Exibir este corte no catálogo do totem.</small>
              </span>
            </label>

            {erro && (
              <div className="operations-error" role="alert">
                <AlertCircle size={17} />
                {erro}
              </div>
            )}

            <button className="button-primary cut-submit" disabled={salvando}>
              {salvando ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <Save size={17} />
              )}
              {salvando ? 'Cadastrando...' : 'Cadastrar corte'}
            </button>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
