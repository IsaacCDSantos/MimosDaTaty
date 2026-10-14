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
        setTotalCarrinho(prevTotal => prevTotal + valorAdicionado);
    };

    return (
        <div className={'catalogoContainer'}>
            {/* Header com Navegação usando React Router DOM */}
            <header className={'catalogoHeader'}>
                <nav className={'catalogoNav'}>
                    <Link to="/" className={'navBtn'}>Home</Link>
                    <Link to="/catalogo" className={'navBtn'}>Catálogo</Link>
                    <Link to="/sobre" className={'navBtn'}>Sobre Nós</Link>
                    <Link to="/contato" className={'navBtn'}>Contato</Link>
                </nav>

                {/* Carrinho de Compras com SVG Inline */}
                <div className={'cartBadge'}>
                    <svg
                        className={'cartIcon'}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                    <span>R$ {totalCarrinho.toFixed(2).replace('.', ',')}</span>
                </div>
            </header>

            {/* Banner da Página */}
            <div className={'catalogoBanner'}>
                <h1 className={'bannerTexto'}>
                    "Nosso Catálogo" - Encontre o mimo perfeito feito à mão com carinho
                </h1>
                <div className={'bannerImgContainer'}>
                    <img
                        src="https://via.placeholder.com/474x211"
                        alt="Produtos Artesanais"
                        className={'bannerImg'}
                    />
                </div>
            </div>

            {/* Conteúdo Principal */}
            <main className={'mainCard'}>
                {/* Filtros de Categorias */}
                <section className={'categoriasBar'}>
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
                <section className={'cartItemsList'}>
                    {produtos.map((produto) => (
                        <div key={produto.id} className={'cartItem'}>
                            <img
                                src={produto.imagem}
                                alt={produto.nome}
                                className={'itemImg'}
                            />
                            <div className={'itemContent'}>
                                <div className={'itemHeader'}>
                                    <h2 className={'itemTitulo'}>{produto.nome}</h2>
                                    <span className={'itemPreco'}>
                                        R$ {produto.preco.toFixed(2).replace('.', ',')}
                                    </span>
                                </div>

                                <p className={'itemDescricao'}>{produto.descricao}</p>

                                <div className={'itemControls'}>
                                    <div className={'qtdSelector'}>
                                        <button
                                            className={'btnQtd'}
                                            onClick={() => alterarQuantidade(produto.id, -1)}
                                        >
                                            -
                                        </button>
                                        <span className={'qtdDisplay'}>Qtd: {produto.quantidade}</span>
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
                                        className={'.btnAddCart'}
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