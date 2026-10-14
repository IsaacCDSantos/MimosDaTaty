import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Carrinho.css'
import kitBercoImg from '../../assets/imagens/kit_berco_florido_figma.png'
import mantaCrocheImg from '../../assets/imagens/manta_croche_bebe_figma.png'
import trocadorCrocheImg from '../../assets/imagens/trocador_croche_figma.png'

const ITENS_INICIAIS = [
  {
    id: 'kit-berco-florido',
    nome: 'Kit de berço florido',
    preco: 189.0,
    descricao: 'Conjunto com manta, toalha e trocador em crochê com acabamento delicado.',
    prazo: 'Entrega em até 7 dias úteis',
    imagem: kitBercoImg,
    quantidade: 1,
  },
  {
    id: 'manta-croche-bebe',
    nome: 'Manta de crochê bebê',
    preco: 129.0,
    descricao: 'Peça macia e leve para complementar o enxoval com um toque especial.',
    prazo: 'Entrega em até 7 dias úteis',
    imagem: mantaCrocheImg,
    quantidade: 1,
  },
  {
    id: 'trocador-croche',
    nome: 'Trocador de crochê',
    preco: 89.0,
    descricao: 'Peça prática e decorativa para o banho e o cuidado diário do bebê.',
    prazo: 'Entrega em até 7 dias úteis',
    imagem: trocadorCrocheImg,
    quantidade: 1,
  },
]

function Carrinho({ aoNavegar }) {
  const navigate = useNavigate()
  const [itens, setItens] = useState(ITENS_INICIAIS)

  const subtotal = itens.reduce((acc, item) => acc + item.preco * item.quantidade, 0)
  const frete = itens.length > 0 ? 25.0 : 0.0
  const desconto = 0.0
  const total = itens.length > 0 ? subtotal + frete - desconto : 0.0

  const alterarQuantidade = (id, delta) => {
    setItens((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const novaQtd = item.quantidade + delta
            return novaQtd > 0 ? { ...item, quantidade: novaQtd } : null
          }
          return item
        })
        .filter(Boolean)
    )
  }

  const removerItem = (id) => {
    setItens((prev) => prev.filter((item) => item.id !== id))
  }

  const restaurarItensPadrao = () => {
    setItens(ITENS_INICIAIS)
  }

  const navegar = (destino) => {
    if (typeof aoNavegar === 'function') {
      aoNavegar(destino)
    } else {
      navigate(destino)
    }
  }

  const formatarMoeda = (valor) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <div className="carrinho-container">
      {/* Menu Superior no padrão das telas internas */}
      <nav className="carrinho-nav" aria-label="Navegação secundária">
        <button type="button" className="nav-btn" onClick={() => navegar('/')}>
          Home
        </button>
        <button type="button" className="nav-btn" onClick={() => navegar('/#catalogo')}>
          Catálogo
        </button>
        <button type="button" className="nav-btn" onClick={() => navegar('/#sobre')}>
          Sobre Nós
        </button>
        <button type="button" className="nav-btn" onClick={() => navegar('/#contato')}>
          Contato
        </button>
      </nav>

      <div className="carrinho-content">
        {/* Painel Esquerdo - Lista de Itens */}
        <section className="card-carrinho-lista" aria-labelledby="titulo-carrinho">
          <div className="carrinho-header">
            <h1 id="titulo-carrinho" className="script-title-carrinho">
              Meu carrinho
            </h1>
            <p className="carrinho-subtitle">
              Revise os itens selecionados, confira os valores e avance para o pagamento quando estiver pronto.
            </p>
          </div>

          {itens.length === 0 ? (
            <div className="carrinho-vazio">
              <div className="icone-carrinho-vazio" aria-hidden="true">
                🛍️
              </div>
              <h2 className="script-title-vazio">Seu carrinho está vazio</h2>
              <p className="texto-carrinho-vazio">
                Parece que você ainda não adicionou nenhum mimo artesanal ao seu carrinho.
              </p>
              <div className="acoes-carrinho-vazio">
                <button
                  type="button"
                  className="btn-voltar-catalogo"
                  onClick={() => navegar('/#catalogo')}
                >
                  Explorar Catálogo
                </button>
                <button
                  type="button"
                  className="btn-restaurar-itens"
                  onClick={restaurarItensPadrao}
                >
                  Restaurar Itens do Protótipo
                </button>
              </div>
            </div>
          ) : (
            <div className="carrinho-itens-lista">
              {itens.map((item) => (
                <article key={item.id} className="carrinho-item-card">
                  <div className="carrinho-item-imagem-container">
                    <img
                      src={item.imagem}
                      alt={item.nome}
                      className="carrinho-item-imagem"
                      loading="lazy"
                    />
                  </div>

                  <div className="carrinho-item-corpo">
                    <div className="carrinho-item-topo">
                      <h2 className="carrinho-item-nome">{item.nome}</h2>
                      <span className="carrinho-item-preco">
                        {formatarMoeda(item.preco * item.quantidade)}
                      </span>
                    </div>

                    <p className="carrinho-item-descricao">{item.descricao}</p>

                    <div className="carrinho-item-rodape">
                      <div className="carrinho-item-qtd-controle">
                        <button
                          type="button"
                          className="btn-qtd-acao"
                          aria-label={`Diminuir quantidade de ${item.nome}`}
                          onClick={() => alterarQuantidade(item.id, -1)}
                        >
                          -
                        </button>
                        <span className="carrinho-item-qtd-texto">
                          Qtd: {item.quantidade}
                        </span>
                        <button
                          type="button"
                          className="btn-qtd-acao"
                          aria-label={`Aumentar quantidade de ${item.nome}`}
                          onClick={() => alterarQuantidade(item.id, 1)}
                        >
                          +
                        </button>
                      </div>

                      <span className="carrinho-item-prazo">{item.prazo}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-remover-item"
                    onClick={() => removerItem(item.id)}
                    aria-label={`Remover ${item.nome} do carrinho`}
                  >
                    Remover
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Painel Direito - Resumo do Pedido */}
        <aside className="card-carrinho-resumo" aria-labelledby="titulo-resumo">
          <div className="resumo-topo">
            <h2 id="titulo-resumo" className="script-title-resumo">
              Resumo
            </h2>
            <p className="carrinho-subtitle">
              Confira os valores antes de avançar para a finalização do pedido.
            </p>

            <div className="resumo-linhas-carrinho">
              <div className="resumo-linha-carrinho">
                <span>Subtotal</span>
                <strong>{formatarMoeda(subtotal)}</strong>
              </div>
              <div className="resumo-linha-carrinho">
                <span>Frete</span>
                <strong>{formatarMoeda(frete)}</strong>
              </div>
              <div className="resumo-linha-carrinho">
                <span>Desconto</span>
                <strong>{formatarMoeda(desconto)}</strong>
              </div>
            </div>

            <div className="divisor-carrinho" aria-hidden="true" />

            <div className="resumo-total-bloco">
              <div className="resumo-total-linha">
                <span className="total-label">Total</span>
                <span className="total-valor">{formatarMoeda(total)}</span>
              </div>
              <p className="total-estimado-obs">
                Valor estimado para o envio padrão.
              </p>
            </div>
          </div>

          <div className="resumo-base">
            <button
              type="button"
              className="btn-avancar-pagamento"
              onClick={() => navegar('/checkout')}
              disabled={itens.length === 0}
            >
              Avançar para pagamento
            </button>
            <p className="aviso-proxima-etapa">
              A próxima etapa será a confirmação do endereço e do pagamento.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Carrinho
