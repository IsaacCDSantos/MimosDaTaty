import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { servicoPecas, supabaseConfigurado } from '../../servicos/catalogo';
import './Catalogo.css';
import { useCarrinho } from '../../carrinho/useCarrinho';

const PRODUTOS_INICIAIS = [
    {
        id: 1,
        nome: 'Kit de berço florido',
        preco: 189.00,
        descricao: 'Conjunto com manta, toalha e trocador em crochê com acabamento delicado.',
        imagem: 'https://via.placeholder.com/120',
        quantidade: 1
    },
    {
        id: 2,
        nome: 'Manta de crochê bebê',
        preco: 129.00,
        descricao: 'Peça macia e leve para complementar o enxoval com um toque especial.',
        imagem: 'https://via.placeholder.com/120',
        quantidade: 1
    },
    {
        id: 3,
        nome: 'Trocador de crochê',
        preco: 89.00,
        descricao: 'Peça prática e decorativa para o banho e o cuidado diário do bebê.',
        imagem: 'https://via.placeholder.com/120',
        quantidade: 1
    },
    {
        id: 4,
        nome: 'Almofada de amamentação em crochê',
        preco: 189.00,
        descricao: 'Confortável e delicada, com acabamento artesanal em tons suaves de creme e rosé para tornar os momentos de amamentação ainda mais aconchegantes.',
        imagem: 'https://via.placeholder.com/120',
        quantidade: 1
    },
    {
        id: 5,
        nome: 'Ninho redutor de crochê',
        preco: 189.00,
        descricao: 'Aconchegante e delicado, com bordas trançadas e detalhes florais para oferecer mais conforto ao bebê e um toque artesanal ao enxoval.',
        imagem: 'https://via.placeholder.com/120',
        quantidade: 1
    }
];

function produtoDaPeca(peca) {
    const preco = Number(peca.preco);
    const estoque = Number(peca.estoque);
    if (!Number.isFinite(preco) || preco <= 0 || !Number.isSafeInteger(estoque) || estoque < 0) {
        throw new Error('Os dados da peça são inválidos.');
    }
    const prazo = typeof peca.prazo === 'string' ? peca.prazo.trim() : '';
    return {
        ...peca,
        preco,
        estoque,
        imagem: peca.imagem,
        prazo: prazo ? (/^entrega\b/i.test(prazo) ? prazo : 'Entrega em até ' + prazo) : 'Consulte o prazo de entrega',
        quantidade: 1,
    };
}

function limiteDaPeca(produto) {
    return supabaseConfigurado && produto.tipoDisponibilidade === 'pronta_entrega' ? produto.estoque : Infinity;
}

export default function Catalogo() {
    const [produtos, setProdutos] = useState(() => supabaseConfigurado ? [] : PRODUTOS_INICIAIS);
    const [situacao, setSituacao] = useState(supabaseConfigurado ? 'carregando' : 'pronto');
    const [tentativa, setTentativa] = useState(0);
    const carrinho = useCarrinho();
    const totalCarrinho = carrinho.subtotalCentavos / 100;
    const [avisoCarrinho, setAvisoCarrinho] = useState('');

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
        return () => { ativo = false; };
    }, [tentativa]);

    const tentarNovamente = () => {
        setSituacao('carregando');
        setTentativa(valor => valor + 1);
    };

    const alterarQuantidade = (id, delta) => {
        setProdutos(produtosAnteriores =>
            produtosAnteriores.map(item => {
                if (item.id === id) {
                    const limite = limiteDaPeca(item);
                    if (limite === 0) return item;
                    const novaQtd = Math.min(limite, Math.max(1, item.quantidade + delta));
                    return { ...item, quantidade: novaQtd };
                }
                return item;
            })
        );
    };

    const adicionarAoCarrinho = (produto) => {
        if (produto.quantidade > limiteDaPeca(produto)) return;
        try { carrinho.adicionar(produto); setAvisoCarrinho('Peça adicionada ao carrinho.'); } catch (erro) { setAvisoCarrinho(erro.message); }
    };

    return (
        <div className={'catalogoContainer'}>
            {/* Header com Navegação usando React Router DOM */}
            <header className={'catalogoHeader'}>
                <nav className={'catalogoNav'}>
                    <Link to="/" className={'navBtn'}>Início</Link>
                    <Link to="/catalogo" className={'navBtn'}>Catálogo</Link>
                    <Link to="/#sobre" className={'navBtn'}>Sobre Nós</Link>
                    <Link to="/#contato" className={'navBtn'}>Contato</Link>
                </nav>

                {/* Botão do Carrinho de Compras */}
                <Link
                    to="/carrinho"
                    className={'botaoCarrinho'}
                    aria-label="Ir para o carrinho"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                            d="M1 2h4l2.68 12.39A2 2 0 0 0 9.68 16H19.4a2 2 0 0 0 2-1.61L23 6H6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <circle cx="9" cy="21" r="1" fill="currentColor" />
                        <circle cx="20" cy="21" r="1" fill="currentColor" />
                    </svg>
                    <span>R${totalCarrinho.toFixed(2).replace('.', ',')}</span>
                </Link>
            </header>

            {/* Conteúdo Principal */}
            <main className={'cardPrincipal'}>
                {avisoCarrinho && <p className={'catalogoEstado'} role='status'>{avisoCarrinho}</p>}
                {!supabaseConfigurado && <p className={'catalogoAvisoDemonstracao'}>Catálogo de demonstração. Produtos e valores ilustrativos.</p>}
                {/* Filtros de Categorias */}
                <section className={'barraCategorias'}>
                    <span className={'categoriasTitulo'}>Categorias:</span>
                    <label className={'categoriaItem'}>
                        <input type="checkbox" /> Maternidade
                    </label>
                    <label className={'categoriaItem'}>
                        <input type="checkbox" /> Enxovais
                    </label>
                    <label className={'categoriaItem'}>
                        <input type="checkbox" /> Crochê & Bordado
                    </label>
                    <label className={'categoriaItem'}>
                        <input type="checkbox" /> Presentes
                    </label>
                </section>

                {/* Mapeamento de Produtos */}
                <section className={'listaProdutos'} aria-busy={situacao === 'carregando'}>
                    {situacao === 'carregando' && <p className={'catalogoEstado'} role="status">Carregando peças do catálogo...</p>}
                    {situacao === 'erro' && <div className={'catalogoEstado'} role="alert"><p>Não foi possível carregar o catálogo agora. Tente novamente.</p><button type="button" className={'btnAdicionarCarrinho'} onClick={tentarNovamente}>Tentar novamente</button></div>}
                    {situacao === 'pronto' && produtos.length === 0 && <p className={'catalogoEstado'} role="status">Nenhuma peça disponível no momento.</p>}
                    {situacao === 'pronto' && produtos.map((produto) => (
                        <div key={produto.id} className={'itemCatalogo'}>
                            <img
                                src={produto.imagem}
                                alt={produto.nome}
                                className={'itemImagem'}
                            />
                            <div className={'itemConteudo'}>
                                <div className={'itemHeader'}>
                                    <h2 className={'itemTitulo'}>{produto.nome}</h2>
                                    <span className={'itemPreco'}>
                                        R$ {produto.preco.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>

                                <p className={'itemDescricao'}>{produto.descricao}</p>

                                <div className={'itemControles'}>
                                    <div className={'seletorQtd'}>
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
                                            disabled={produto.quantidade >= limiteDaPeca(produto)}
                                            onClick={() => alterarQuantidade(produto.id, 1)}
                                        >
                                            +
                                        </button>
                                        <span className={'prazoEntrega'}>
                                            {produto.prazo || 'Entrega em até 7 dias úteis'}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className={'btnAdicionarCarrinho'}
                                        disabled={limiteDaPeca(produto) === 0}
                                        onClick={() => adicionarAoCarrinho(produto)}
                                    >
                                        {limiteDaPeca(produto) === 0 ? 'Sem estoque' : 'Adicionar ao carrinho'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            </main>
        </div>
    );
}
