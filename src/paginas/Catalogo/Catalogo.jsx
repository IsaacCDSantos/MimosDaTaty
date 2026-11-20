import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { servicoPecas, supabaseConfigurado } from '../../servicos/catalogo';
import { servicoVisualizacoes } from '../../servicos/destaques';
import { criarRegistradorAbertura } from './registrarAbertura';
import './Catalogo.css';
import { useCarrinho } from '../../carrinho/useCarrinho';
import { LIMITE_POR_PECA } from '../../carrinho/modelo';
import DetalhePeca from './DetalhePeca';
import Header from '../../componentes/Header/Header';
import { aplicarSeo, montarTitulo, resumirDescricao } from '../../servicos/seo';
import MiniaturaProduto from './MiniaturaProduto';
import {
  CATEGORIAS_CATALOGO,
  PRODUTOS_INICIAIS,
  slugDaPeca,
} from './produtosCatalogo';

const registrarAbertura = criarRegistradorAbertura({
  registrar: (pecaId, aberturaId) => servicoVisualizacoes.registrarVisualizacao(pecaId, aberturaId),
});

function produtoDaPeca(peca) {
  const preco = Number(peca.preco);
  if (!Number.isFinite(preco) || preco <= 0) {
    throw new Error('Os dados da peça são inválidos.');
  }
  const prazo = typeof peca.prazo === 'string' ? peca.prazo.trim() : '';
  return {
    ...peca,
    preco,
    imagem: peca.imagem,
    prazo: prazo
      ? /^entrega\b/i.test(prazo)
        ? prazo
        : 'Entrega em até ' + prazo
      : 'Consulte o prazo de entrega',
    quantidade: 1,
  };
}

// Todas as peças são sob encomenda: o estoque não limita a quantidade.
function limiteDaPeca() {
  return LIMITE_POR_PECA;
}

export default function Catalogo() {
  const { pecaSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [produtos, setProdutos] = useState(() =>
    supabaseConfigurado ? [] : PRODUTOS_INICIAIS
  );
  const [situacao, setSituacao] = useState(supabaseConfigurado ? 'carregando' : 'pronto');
  const [tentativa, setTentativa] = useState(0);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState([]);
  const [personalizacoes, setPersonalizacoes] = useState({});
  const [faseTransicao, setFaseTransicao] = useState('ocioso'); // 'ocioso' | 'saindo-lista' | 'saindo-detalhe'

  const carrinho = useCarrinho();
  const [avisoCarrinho, setAvisoCarrinho] = useState('');

  const timerTransicaoRef = useRef(null);
  const personalizacoesRef = useRef(personalizacoes);

  const produtoSelecionado = pecaSlug
    ? produtos.find(
        (item) =>
          slugDaPeca(item) === pecaSlug || String(item.id) === String(pecaSlug)
      ) || null
    : null;

  // A página de cada peça aparece no Google com o nome e a descrição dela.
  const tituloPeca = produtoSelecionado ? montarTitulo(produtoSelecionado.nome) : null;
  const descricaoPeca = produtoSelecionado ? resumirDescricao(produtoSelecionado.descricao) : null;
  const caminhoPeca = produtoSelecionado ? `/catalogo/${slugDaPeca(produtoSelecionado)}` : null;
  useEffect(() => {
    if (caminhoPeca) aplicarSeo({ titulo: tituloPeca, descricao: descricaoPeca, caminho: caminhoPeca, indexar: true });
  }, [tituloPeca, descricaoPeca, caminhoPeca]);

  useEffect(() => {
    personalizacoesRef.current = personalizacoes;
  }, [personalizacoes]);

  useEffect(() => {
    return () => {
      if (timerTransicaoRef.current) {
        clearTimeout(timerTransicaoRef.current);
      }
      Object.values(personalizacoesRef.current).forEach((dados) => {
        dados.imagens?.forEach((img) => {
          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
        });
      });
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    let ativo = true;

    async function carregarPecas() {
      try {
        const pecas = await servicoPecas.listarPecas({ somenteVisiveis: true });
        const novosProdutos = pecas.map(produtoDaPeca);
        if (ativo) {
          setProdutos(novosProdutos);
          setSituacao('pronto');
        }
      } catch {
        if (ativo) {
          setProdutos([]);
          setSituacao('erro');
        }
      }
    }

    carregarPecas();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  useEffect(() => {
    if (situacao === 'pronto' && pecaSlug && !produtoSelecionado) {
      navigate('/catalogo', { replace: true });
    }
  }, [situacao, pecaSlug, produtoSelecionado, navigate]);

  const produtoIdSelecionado = produtoSelecionado?.id ?? null;

  useEffect(() => {
    void registrarAbertura({
      pecaId: produtoIdSelecionado,
      navegacao: location.key,
      habilitado: supabaseConfigurado && situacao === 'pronto',
    });
  }, [produtoIdSelecionado, location.key, situacao]);

  useEffect(() => {
    if (!produtoIdSelecionado) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [produtoIdSelecionado]);

  const voltarParaCatalogo = useCallback(() => {
    if (!produtoSelecionado || faseTransicao !== 'ocioso') return;
    if (timerTransicaoRef.current) clearTimeout(timerTransicaoRef.current);

    setFaseTransicao('saindo-detalhe');
    timerTransicaoRef.current = setTimeout(() => {
      navigate('/catalogo');
      setFaseTransicao('ocioso');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 200);
  }, [produtoSelecionado, faseTransicao, navigate]);

  useEffect(() => {
    if (!produtoSelecionado) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        voltarParaCatalogo();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [produtoSelecionado, voltarParaCatalogo]);

  const tentarNovamente = () => {
    setSituacao('carregando');
    setTentativa((valor) => valor + 1);
  };

  const alternarCategoria = (categoria) => {
    setCategoriasSelecionadas((anteriores) =>
      anteriores.includes(categoria)
        ? anteriores.filter((c) => c !== categoria)
        : [...anteriores, categoria]
    );
  };

  const produtosFiltrados =
    categoriasSelecionadas.length === 0
      ? produtos
      : produtos.filter((p) => categoriasSelecionadas.includes(p.categoria));

  const alterarQuantidade = (id, delta) => {
    setProdutos((produtosAnteriores) =>
      produtosAnteriores.map((item) => {
        if (item.id === id) {
          const novaQtd = Math.min(limiteDaPeca(), Math.max(1, item.quantidade + delta));
          return { ...item, quantidade: novaQtd };
        }
        return item;
      })
    );
  };

  const atualizarPersonalizacao = (produtoId, dados) => {
    setPersonalizacoes((anteriores) => ({
      ...anteriores,
      [produtoId]: dados,
    }));
  };

  const obterPersonalizacao = (produto) => {
    const rascunho = personalizacoes[produto.id];
    if (rascunho) return rascunho;
    const noCarrinho = carrinho.itens.find((i) => i.id === String(produto.id));
    if (noCarrinho && (noCarrinho.observacoes || noCarrinho.imagensReferencia?.length)) {
      return {
        observacoes: noCarrinho.observacoes || '',
        imagens: noCarrinho.imagensReferencia || [],
      };
    }
    return undefined;
  };

  const adicionarAoCarrinho = (produto, personalizacaoExtra) => {
    if (produto.quantidade > limiteDaPeca()) {
      return { ok: false, mensagem: `Cada peça aceita até ${LIMITE_POR_PECA} unidades por pedido.` };
    }
    const pers = personalizacaoExtra || obterPersonalizacao(produto);
    const imagensReferencia = (pers?.imagens || []).map((img) => ({
      id: img.id,
      nome: img.nome,
      dataUrl: img.dataUrl || '',
    }));

    try {
      carrinho.adicionar({
        ...produto,
        observacoes: pers?.observacoes || '',
        imagensReferencia,
      });
      setAvisoCarrinho('Peça adicionada ao carrinho.');
      return { ok: true };
    } catch (erro) {
      setAvisoCarrinho(erro.message);
      return { ok: false, mensagem: erro.message };
    }
  };

  const abrirDetalhesPeca = (produto) => {
    if (faseTransicao !== 'ocioso') return;
    if (timerTransicaoRef.current) clearTimeout(timerTransicaoRef.current);

    setFaseTransicao('saindo-lista');
    timerTransicaoRef.current = setTimeout(() => {
      navigate(`/catalogo/${slugDaPeca(produto)}`);
      setFaseTransicao('ocioso');
    }, 210);
  };

  return (
    <>
    <Header />
    <div className={'catalogoContainer'}>
      {/* Palco com transição dinâmica entre a lista do catálogo e a tela da peça */}
      <div className={'catalogoPalco'}>
        {produtoSelecionado ? (
          <DetalhePeca
            key={produtoSelecionado.id}
            produto={produtoSelecionado}
            limiteMaximo={limiteDaPeca()}
            personalizacaoInicial={obterPersonalizacao(produtoSelecionado)}
            saindo={faseTransicao === 'saindo-detalhe'}
            aoAtualizarPersonalizacao={atualizarPersonalizacao}
            aoAlterarQuantidade={alterarQuantidade}
            aoAdicionarAoCarrinho={adicionarAoCarrinho}
            aoVoltar={voltarParaCatalogo}
            aoIrParaCarrinho={() => navigate('/carrinho')}
          />
        ) : (
          <main
            className={`cardPrincipal ${
              faseTransicao === 'saindo-lista' ? 'listaSaindo' : 'listaEntrando'
            }`}
          >
            <h1 className={'catalogoTituloOculto'}>Catálogo de enxoval de bebê em crochê e bordado</h1>
            {avisoCarrinho && (
              <p className={'catalogoEstado'} role="status">
                {avisoCarrinho}
              </p>
            )}
            {!supabaseConfigurado && (
              <p className={'catalogoAvisoDemonstracao'}>
                Catálogo de demonstração. Produtos e valores ilustrativos.
              </p>
            )}

            {/* Filtros de Categorias */}
            <section className={'barraCategorias'} aria-label="Filtros de categorias">
              <div className={'categoriasCabecalho'}>
                <span className={'categoriasIcone'} aria-hidden="true">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16M7 12h10M10 18h4"
                      stroke="currentColor"
                      strokeWidth="2.1"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className={'categoriasTitulo'}>Categorias</span>
              </div>

              <div className={'categoriasLista'}>
                <button
                  type="button"
                  className={`categoriaChipTodas ${
                    categoriasSelecionadas.length === 0 ? 'categoriaItemAtiva' : ''
                  }`}
                  onClick={() => setCategoriasSelecionadas([])}
                >
                  Todas
                </button>

                {CATEGORIAS_CATALOGO.map((categoria) => {
                  const selecionada = categoriasSelecionadas.includes(categoria);
                  return (
                    <label
                      key={categoria}
                      className={`categoriaItem ${selecionada ? 'categoriaItemAtiva' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={'categoriaCheckboxOculto'}
                        checked={selecionada}
                        onChange={() => alternarCategoria(categoria)}
                      />
                      <span className={'categoriaIndicador'} aria-hidden="true">
                        {selecionada && (
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M3.5 8.5L6.5 11.5L12.5 5"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span>{categoria}</span>
                    </label>
                  );
                })}
              </div>
            </section>

            {/* Mapeamento de Produtos */}
            <section className={'listaProdutos'} aria-busy={situacao === 'carregando'}>
              {situacao === 'carregando' && (
                <p className={'catalogoEstado'} role="status">
                  Carregando peças do catálogo...
                </p>
              )}
              {situacao === 'erro' && (
                <div className={'catalogoEstado'} role="alert">
                  <p>Não foi possível carregar o catálogo agora. Tente novamente.</p>
                  <button
                    type="button"
                    className={'btnAdicionarCarrinho'}
                    onClick={tentarNovamente}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {situacao === 'pronto' && produtos.length === 0 && (
                <p className={'catalogoEstado'} role="status">
                  Nenhuma peça disponível no momento.
                </p>
              )}
              {situacao === 'pronto' &&
                produtos.length > 0 &&
                produtosFiltrados.length === 0 && (
                  <p className={'catalogoEstado'} role="status">
                    Nenhuma peça encontrada nas categorias selecionadas.
                  </p>
                )}
              {situacao === 'pronto' &&
                produtosFiltrados.map((produto) => {
                  const pers = obterPersonalizacao(produto);
                  const qtdImagens = pers?.imagens?.length || 0;
                  const temTexto = Boolean(pers?.observacoes?.trim());

                  return (
                    <article
                      key={produto.id}
                      className={'itemCatalogo itemCatalogoClicavel'}
                      role="button"
                      tabIndex={0}
                      aria-label={`Personalizar ${produto.nome}`}
                      onClick={() => abrirDetalhesPeca(produto)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          abrirDetalhesPeca(produto);
                        }
                      }}
                    >
                      <div className={'itemImagemMoldura'}>
                        <MiniaturaProduto
                          src={produto.imagem}
                          alt={produto.nome}
                          className={'itemImagem'}
                          larguraAlvo={520}
                        />
                      </div>
                      <div className={'itemConteudo'}>
                        <div className={'itemHeader'}>
                          <div className={'itemTituloGrupo'}>
                            <h2 className={'itemTitulo'}>{produto.nome}</h2>
                            {(qtdImagens > 0 || temTexto) && (
                              <span className={'itemBadgePersonalizado'}>
                                {qtdImagens > 0
                                  ? `${qtdImagens} foto(s) de referência`
                                  : 'Detalhes preenchidos'}
                              </span>
                            )}
                          </div>
                          <span className={'itemPreco'}>
                            R$ {produto.preco.toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <p className={'itemDescricao'}>{produto.descricao}</p>

                        <div className={'itemControles'}>
                          <div
                            className={'seletorQtd'}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={'btnQtd'}
                              aria-label={'Diminuir quantidade de ' + produto.nome}
                              disabled={produto.quantidade <= 1}
                              onClick={() => alterarQuantidade(produto.id, -1)}
                            >
                              -
                            </button>
                            <span className={'exibicaoQtd'}>Qtd: {produto.quantidade}</span>
                            <button
                              type="button"
                              className={'btnQtd'}
                              aria-label={'Aumentar quantidade de ' + produto.nome}
                              disabled={produto.quantidade >= limiteDaPeca()}
                              onClick={() => alterarQuantidade(produto.id, 1)}
                            >
                              +
                            </button>
                          </div>

                          <div
                            className={'itemAcoesDireita'}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={'btnPersonalizarPeca'}
                              onClick={() => abrirDetalhesPeca(produto)}
                            >
                              Personalizar & referências
                            </button>
                            <button
                              type="button"
                              className={'btnAdicionarCarrinho'}
                              onClick={() => adicionarAoCarrinho(produto)}
                            >
                              Adicionar ao carrinho
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </section>
          </main>
        )}
      </div>
    </div>
    </>
  );
}
