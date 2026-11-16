import { useEffect, useRef, useState } from 'react';
import './DetalhePeca.css';

const MAX_IMAGENS = 6;
const MAX_TAMANHO_MB = 10;
const MAX_LARGURA_MINIATURA = 360;

const SUGESTOES_DETALHES = [
  'Paleta de cores: ',
  'Nome para bordar: ',
  'Medidas desejadas: ',
  'Acabamento e detalhes: ',
];

function formatarMoeda(valor) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function formatarTamanhoArquivo(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function gerarMiniaturaDataUrl(previewUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const escala = Math.min(1, MAX_LARGURA_MINIATURA / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 1) * escala));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 1) * escala));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = previewUrl;
  });
}

export default function DetalhePeca({
  produto,
  limiteMaximo = Infinity,
  personalizacaoInicial,
  saindo,
  aoAtualizarPersonalizacao,
  aoAlterarQuantidade,
  aoAdicionarAoCarrinho,
  aoVoltar,
  aoIrParaCarrinho,
}) {
  const inputArquivoRef = useRef(null);
  const textareaRef = useRef(null);
  const [arrastando, setArrastando] = useState(false);
  const [erroAnexo, setErroAnexo] = useState('');
  const [erroCarrinho, setErroCarrinho] = useState('');
  const [adicionadoRecentemente, setAdicionadoRecentemente] = useState(false);
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  const observacoes = personalizacaoInicial?.observacoes ?? '';
  const imagens = personalizacaoInicial?.imagens ?? [];
  const semEstoque = limiteMaximo === 0;

  useEffect(() => {
    if (!imagemAmpliada) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setImagemAmpliada(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imagemAmpliada]);

  useEffect(() => {
    if (!adicionadoRecentemente) return;
    const timer = setTimeout(() => setAdicionadoRecentemente(false), 4500);
    return () => clearTimeout(timer);
  }, [adicionadoRecentemente]);

  const processarArquivos = async (fileList) => {
    const arquivos = Array.from(fileList || []);
    if (arquivos.length === 0) return;

    setErroAnexo('');
    const espacoRestante = MAX_IMAGENS - imagens.length;
    if (espacoRestante <= 0) {
      setErroAnexo(`Você já atingiu o limite de ${MAX_IMAGENS} imagens de referência para esta peça.`);
      return;
    }

    const novasImagens = [];
    const avisos = [];

    for (const arquivo of arquivos) {
      if (!arquivo.type.startsWith('image/')) {
        avisos.push(`"${arquivo.name}" não é uma imagem válida.`);
        continue;
      }
      if (arquivo.size > MAX_TAMANHO_MB * 1024 * 1024) {
        avisos.push(`"${arquivo.name}" excede o limite de ${MAX_TAMANHO_MB} MB.`);
        continue;
      }
      if (novasImagens.length >= espacoRestante) {
        avisos.push(`Limite de ${MAX_IMAGENS} imagens atingido; alguns arquivos extras não foram incluídos.`);
        break;
      }

      const previewUrl = URL.createObjectURL(arquivo);
      const dataUrl = await gerarMiniaturaDataUrl(previewUrl);

      novasImagens.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        nome: arquivo.name,
        tamanho: arquivo.size,
        previewUrl,
        dataUrl,
      });
    }

    if (avisos.length > 0) {
      setErroAnexo(avisos[0]);
    }

    if (novasImagens.length > 0) {
      aoAtualizarPersonalizacao(produto.id, {
        observacoes,
        imagens: [...imagens, ...novasImagens],
      });
    }
  };

  const handleSelecionarArquivos = (e) => {
    processarArquivos(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    processarArquivos(e.dataTransfer.files);
  };

  const handleRemoverImagem = (imagemId) => {
    const alvo = imagens.find((img) => img.id === imagemId);
    if (alvo?.previewUrl) {
      URL.revokeObjectURL(alvo.previewUrl);
    }
    if (imagemAmpliada?.id === imagemId) {
      setImagemAmpliada(null);
    }
    setErroAnexo('');
    aoAtualizarPersonalizacao(produto.id, {
      observacoes,
      imagens: imagens.filter((img) => img.id !== imagemId),
    });
  };

  const handleTextoChange = (e) => {
    aoAtualizarPersonalizacao(produto.id, {
      observacoes: e.target.value,
      imagens,
    });
  };

  const inserirSugestao = (prefixo) => {
    const jaTemConteudo = observacoes.trim().length > 0;
    const separador = jaTemConteudo && !observacoes.endsWith('\n') ? '\n' : '';
    const proximoTexto = `${observacoes}${separador}${prefixo}`.slice(0, 1000);
    aoAtualizarPersonalizacao(produto.id, {
      observacoes: proximoTexto,
      imagens,
    });
    textareaRef.current?.focus();
  };

  const handleAdicionar = () => {
    if (semEstoque) return;
    setErroCarrinho('');
    const resultado = aoAdicionarAoCarrinho(produto, { observacoes, imagens });
    if (resultado && resultado.ok === false) {
      setAdicionadoRecentemente(false);
      setErroCarrinho(resultado.mensagem || 'Não foi possível adicionar ao carrinho.');
      return;
    }
    setAdicionadoRecentemente(true);
  };

  const subtotalPeca = produto.preco * produto.quantidade;

  return (
    <section
      className={`detalhePecaWrapper ${saindo ? 'detalheSaindo' : 'detalheEntrando'}`}
      aria-label={`Personalização de ${produto.nome}`}
    >
      {/* Barra superior de retorno e contexto */}
      <div className="detalheBarraTopo">
        <button type="button" className="btnVoltarCatalogo" onClick={aoVoltar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Voltar ao catálogo</span>
        </button>

        <nav className="detalheBreadcrumb" aria-label="Localização atual">
          <button type="button" className="breadcrumbLink" onClick={aoVoltar}>
            Catálogo
          </button>
          <span aria-hidden="true">/</span>
          <span className="breadcrumbAtual">{produto.nome}</span>
        </nav>
      </div>

      {/* Card principal em duas colunas */}
      <div className="detalheCardPrincipal">
        {/* Coluna Esquerda: Apresentação visual da peça */}
        <div className="detalheColunaVitrine">
          <div className="detalheImagemMoldura">
            <img src={produto.imagem} alt={produto.nome} className="detalheImagem" />
            <span className="detalheBadgeCategoria">{produto.categoria || 'Artesanal'}</span>
          </div>

          <div className="detalheResumoArtesanal">
            <div className="detalheTituloLinha">
              <h1 className="detalheTitulo">{produto.nome}</h1>
              <span className="detalhePrecoUnitario">{formatarMoeda(produto.preco)}</span>
            </div>

            <p className="detalheDescricao">{produto.descricao}</p>
            {produto.detalhes && <p className="detalheDescricaoExtra">{produto.detalhes}</p>}

            <div className="detalheMetadados">
              <div className="detalheMetaItem">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
                  <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
                <span>{produto.prazo || 'Consulte o prazo de entrega'}</span>
              </div>
              <div className="detalheMetaItem">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 21s-7-4.35-9.5-8.5C.5 9.2 2.4 5 6.3 5c2.1 0 3.7 1.1 4.7 2.4C12 6.1 13.6 5 15.7 5c3.9 0 5.8 4.2 3.8 7.5C19 16.65 12 21 12 21z"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Confeccionado sob medida à mão</span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Personalização detalhada e imagens de referência */}
        <div className="detalheColunaPersonalizacao">
          <div className="detalheCabecalhoForm">
            <span className="detalheEyebrow">Atendimento sob medida</span>
            <h2 className="detalheSubtituloScript">Personalize o seu pedido</h2>
            <p className="detalheInstrucao">
              Conte os detalhes exatos de como imagina sua peça e anexe referências visuais para a Tati produzir com fidelidade.
            </p>
          </div>

          {/* Campo de texto detalhado */}
          <div className="detalheBlocoCampo">
            <div className="detalheLabelLinha">
              <label htmlFor="detalhes-produto-texto" className="detalheLabel">
                Detalhes da encomenda
              </label>
              <span className="detalheContador">{observacoes.length}/1000</span>
            </div>

            <div className="detalheChipsSugestao" aria-label="Sugestões de preenchimento">
              {SUGESTOES_DETALHES.map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  className="chipSugestao"
                  onClick={() => inserirSugestao(sugestao)}
                >
                  + {sugestao.replace(': ', '')}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              id="detalhes-produto-texto"
              className="detalheTextarea"
              rows={5}
              maxLength={1000}
              value={observacoes}
              onChange={handleTextoChange}
              placeholder="Ex.: Gostaria em tons de rosa antigo com off-white, bordado com o nome 'Helena' em letra cursiva e barrado com mini flores..."
            />
          </div>

          {/* Upload e galeria de imagens de referência */}
          <div className="detalheBlocoCampo">
            <div className="detalheLabelLinha">
              <span className="detalheLabel">Imagens de referência</span>
              <span className="detalheContador">
                {imagens.length}/{MAX_IMAGENS} anexadas
              </span>
            </div>

            <div
              className={`detalheDropzone ${arrastando ? 'dropzoneAtiva' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Selecionar ou arrastar imagens de referência"
              onClick={() => inputArquivoRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputArquivoRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={handleDrop}
            >
              <input
                ref={inputArquivoRef}
                type="file"
                accept="image/*"
                multiple
                className="detalheInputArquivoOculto"
                onChange={handleSelecionarArquivos}
              />

              <div className="dropzoneIcone" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
                  <path
                    d="M4 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L14 16l2.5-2.5a1.5 1.5 0 0 1 2.1 0L21 16"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <p className="dropzoneTitulo">
                {arrastando
                  ? 'Solte as imagens aqui'
                  : 'Clique para anexar ou arraste fotos de referência'}
              </p>
              <p className="dropzoneSubtitulo">
                Cores, inspirações, modelos de bordado (PNG, JPG, WEBP · máx. {MAX_TAMANHO_MB} MB cada)
              </p>
            </div>

            {erroAnexo && (
              <p className="detalheErroAnexo" role="alert">
                {erroAnexo}
              </p>
            )}

            {imagens.length > 0 && (
              <div className="detalheGaleriaAnexos" aria-label="Imagens de referência anexadas">
                {imagens.map((img) => (
                  <div key={img.id} className="anexoCard">
                    <button
                      type="button"
                      className="anexoThumbBtn"
                      onClick={() => setImagemAmpliada(img)}
                      aria-label={`Ampliar referência ${img.nome}`}
                    >
                      <img src={img.previewUrl || img.dataUrl} alt={img.nome} className="anexoThumb" />
                    </button>

                    <div className="anexoInfo">
                      <span className="anexoNome" title={img.nome}>
                        {img.nome}
                      </span>
                      <span className="anexoTamanho">{formatarTamanhoArquivo(img.tamanho || 1024)}</span>
                    </div>

                    <button
                      type="button"
                      className="anexoBtnRemover"
                      onClick={() => handleRemoverImagem(img.id)}
                      aria-label={`Remover ${img.nome}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barra de quantidade e confirmação */}
          <div className="detalheRodapeAcoes">
            <div className="detalheQtdGrupo">
              <span className="detalheQtdLabel">Quantidade</span>
              <div className="seletorQtd">
                <button
                  type="button"
                  className="btnQtd"
                  disabled={produto.quantidade <= 1}
                  onClick={() => aoAlterarQuantidade(produto.id, -1)}
                  aria-label="Diminuir quantidade"
                >
                  -
                </button>
                <span className="exibicaoQtd">Qtd: {produto.quantidade}</span>
                <button
                  type="button"
                  className="btnQtd"
                  disabled={produto.quantidade >= limiteMaximo}
                  onClick={() => aoAlterarQuantidade(produto.id, 1)}
                  aria-label="Aumentar quantidade"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btnAdicionarPersonalizado"
              disabled={semEstoque}
              onClick={handleAdicionar}
            >
              <span>{semEstoque ? 'Sem estoque' : 'Adicionar ao carrinho'}</span>
              {!semEstoque && <strong>{formatarMoeda(subtotalPeca)}</strong>}
            </button>
          </div>

          {erroCarrinho && (
            <p className="detalheErroAnexo" role="alert">
              {erroCarrinho}
            </p>
          )}

          {adicionadoRecentemente && (
            <div className="detalheFeedbackAdicionado" role="status">
              <div className="feedbackTexto">
                <strong>Peça adicionada ao carrinho!</strong>
                <span>
                  {imagens.length > 0 || observacoes.trim()
                    ? `Suas preferências (${imagens.length} imagem(ns) e detalhes) foram registradas no pedido.`
                    : 'Você pode continuar explorando o catálogo ou ir para o carrinho.'}
                </span>
              </div>
              <button
                type="button"
                className="btnIrCarrinhoRapido"
                onClick={aoIrParaCarrinho}
              >
                Ir ao carrinho
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox simples para conferir referência anexada */}
      {imagemAmpliada && (
        <div
          className="detalheLightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização de ${imagemAmpliada.nome}`}
          onClick={() => setImagemAmpliada(null)}
        >
          <div className="detalheLightboxConteudo" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="detalheLightboxFechar"
              onClick={() => setImagemAmpliada(null)}
              aria-label="Fechar visualização"
            >
              ×
            </button>
            <img src={imagemAmpliada.previewUrl || imagemAmpliada.dataUrl} alt={imagemAmpliada.nome} />
            <p>{imagemAmpliada.nome}</p>
          </div>
        </div>
      )}
    </section>
  );
}
