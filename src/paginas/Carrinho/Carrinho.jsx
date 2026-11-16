import { useNavigate } from 'react-router-dom'
import { useCarrinho } from '../../carrinho/useCarrinho'
import './Carrinho.css'
function Carrinho({ aoNavegar }) {
 const navigate = useNavigate()
 const { itens, subtotalCentavos, alterarQuantidade, remover: removerItem } = useCarrinho()
 const subtotal = subtotalCentavos / 100
 const desconto = 0
 const total = subtotal
 const navegar = destino => typeof aoNavegar === 'function' ? aoNavegar(destino) : navigate(destino)
 const formatarMoeda = valor => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return (
    <div className="carrinho-container">
      {/* Menu Superior no padrão das telas internas */}
      <nav className="carrinho-nav" aria-label="Navegação secundária">
        <button type="button" className="nav-btn" onClick={() => navegar('/')}>
          Home
        </button>
        <button type="button" className="nav-btn" onClick={() => navegar('/catalogo')}>
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
                  onClick={() => navegar('/catalogo')}
                >
                  Explorar Catálogo
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
                      decoding="async"
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

                    {(item.observacoes || item.imagensReferencia?.length > 0) && (
                      <div className="carrinho-item-personalizacao">
                        {item.observacoes && (
                          <p className="carrinho-item-observacoes">
                            <strong>Detalhes:</strong> {item.observacoes}
                          </p>
                        )}
                        {item.imagensReferencia?.length > 0 && (
                          <div className="carrinho-item-referencias">
                            <span className="carrinho-item-ref-label">
                              Referências ({item.imagensReferencia.length}):
                            </span>
                            <div className="carrinho-item-ref-thumbs">
                              {item.imagensReferencia.map((refImg) =>
                                refImg.dataUrl ? (
                                  <img
                                    key={refImg.id}
                                    src={refImg.dataUrl}
                                    alt={refImg.nome}
                                    title={refImg.nome}
                                    className="carrinho-item-ref-thumb"
                                  />
                                ) : (
                                  <span key={refImg.id} className="carrinho-item-ref-nome">
                                    {refImg.nome}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

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
                          disabled={item.quantidade >= item.limite}
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
                <strong>A calcular no checkout</strong>
              </div>
              <div className="resumo-linha-carrinho">
                <span>Desconto</span>
                <strong>{formatarMoeda(desconto)}</strong>
              </div>
            </div>

            <div className="divisor-carrinho" aria-hidden="true" />

            <div className="resumo-total-bloco">
              <div className="resumo-total-linha">
                <span className="total-label">Total parcial</span>
                <span className="total-valor">{formatarMoeda(total)}</span>
              </div>
              <p className="total-estimado-obs">
                Subtotal dos produtos. O frete será calculado pelo CEP no checkout.
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
