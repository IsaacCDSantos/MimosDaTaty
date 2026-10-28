import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Catalogo.css';

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

export default function Catalogo() {
    const [produtos, setProdutos] = useState(PRODUTOS_INICIAIS);
    const [totalCarrinho, setTotalCarrinho] = useState(0);

    const alterarQuantidade = (id, delta) => {
        setProdutos(produtosAnteriores =>
            produtosAnteriores.map(item => {
                if (item.id === id) {
                    const novaQtd = Math.max(1, item.quantidade + delta);
                    return { ...item, quantidade: novaQtd };
                }
                return item;
            })
        );
    };

    const adicionarAoCarrinho = (produto) => {
        const valorAdicionado = produto.preco * produto.quantidade;
        setTotalCarrinho(totalAnterior => totalAnterior + valorAdicionado);
    };

    return (
        <div className={'catalogoContainer'}>
            {/* Header com Navegação usando React Router DOM */}
            <header className={'catalogoHeader'}>
                <nav className={'catalogoNav'}>
                    <Link to="/" className={'navBtn'}>Home</Link>
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

            {/* Banner da Página */}
            <div className={'catalogoBanner'}>
                <h1 className={'bannerTexto'}>
                    "Nosso Catálogo" - Encontre o mimo perfeito feito à mão com carinho
                </h1>
                <div className={'bannerImagemContainer'}>
                    <img
                        src="https://via.placeholder.com/474x211"
                        alt="Produtos Artesanais"
                        className={'bannerImagem'}
                    />
                </div>
            </div>

            {/* Conteúdo Principal */}
            <main className={'cardPrincipal'}>
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
                <section className={'listaProdutos'}>
                    {produtos.map((produto) => (
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
                                            className={'btnQtd'}
                                            onClick={() => alterarQuantidade(produto.id, -1)}
                                        >
                                            -
                                        </button>
                                        <span className={'exibicaoQtd'}>Qtd: {produto.quantidade}</span>
                                        <button
                                            className={'btnQtd'}
                                            onClick={() => alterarQuantidade(produto.id, 1)}
                                        >
                                            +
                                        </button>
                                        <span className={'prazoEntrega'}>
                                            Entrega em até 7 dias úteis
                                        </span>
                                    </div>

                                    <button
                                        className={'btnAdicionarCarrinho'}
                                        onClick={() => adicionarAoCarrinho(produto)}
                                    >
                                        Adicionar ao carrinho
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