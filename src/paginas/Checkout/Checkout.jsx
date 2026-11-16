import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCarrinho } from '../../carrinho/useCarrinho';
import { useCotacaoFrete } from '../../carrinho/useCotacaoFrete';
import { cepValido } from '../../servicos/freteModelo';
import './Checkout.css';

function Checkout({ aoNavegar }) {
  const navigate = useNavigate();
  const [formaPagamento, setFormaPagamento] = useState('cartao');
  const { itens, subtotalCentavos } = useCarrinho();
  const [cep, setCep] = useState('');
  const frete = useCotacaoFrete(itens, cep);
  const subtotal = frete.situacao === 'pronto' ? frete.cotacao.subtotalCentavos : subtotalCentavos;
  const total = subtotal + (frete.selecionada?.precoCentavos || 0);
  const moeda = centavos => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
  const prazo = opcao => opcao.prazoMinDias === opcao.prazoMaxDias ? opcao.prazoMaxDias + ' dia(s) úteis' : opcao.prazoMinDias + ' a ' + opcao.prazoMaxDias + ' dias úteis';

  const navegar = (destino) => {
    if (typeof aoNavegar === 'function') {
      aoNavegar(destino);
    } else {
      navigate(destino);
    }
  };

  return (
    <div className="checkout-container">
      {/* Menu Superior */}
      <nav className="checkout-nav">
        <button className="nav-btn" onClick={() => navegar('/')}>Início</button>
        <button className="nav-btn" onClick={() => navegar('/catalogo')}>Catálogo</button>
        <button className="nav-btn" onClick={() => navegar('/#sobre')}>Sobre Nós</button>
        <button className="nav-btn" onClick={() => navegar('/#contato')}>Contato</button>
      </nav>

      <div className="checkout-content">
        {/* Painel Esquerdo - Resumo */}
        <div className="card-resumo">
          <h2 className="script-title">Resumo</h2>
          <p className="card-subtitle">
            Confira os valores antes de avançar para a finalização do pedido.
          </p>

          <div className="resumo-linhas">
            <div className="resumo-linha">
              <span>Subtotal</span>
              <strong>{moeda(subtotal)}</strong>
            </div>
            <div className="resumo-linha">
              <span>Frete</span>
              <strong>{frete.selecionada ? moeda(frete.selecionada.precoCentavos) : 'A calcular'}</strong>
            </div>
            <div className="resumo-linha">
              <span>Desconto</span>
              <strong>R$ 0,00</strong>
            </div>
          </div>

          <div className="resumo-total">
            <span>{frete.selecionada ? 'Total estimado' : 'Total parcial'}</span>
            <span className="valor-total">{moeda(total)}</span>
          </div>
          <p className="total-obs">{frete.selecionada ? 'Inclui o frete selecionado.' : 'Selecione o frete para incluir o envio no total.'}</p>

          <button className="btn-editar-carrinho" onClick={() => navegar('/carrinho')}>
            Editar carrinho
          </button>
        </div>

        {/* Painel Direito - Formulário Checkout */}
        <div className="card-checkout">
          <h2 className="script-title">Checkout</h2>
          <p className="card-subtitle">
            Confira as informações antes de avançar para a finalização.
          </p>

          {itens.length === 0 && <p className="frete-aviso" role="status">Seu carrinho está vazio. <Link to="/catalogo">Escolher peças no catálogo</Link></p>}
          <fieldset disabled className="checkout-pagamento-previa"><legend>Pagamento ainda indisponível</legend>
            {/* Forma de Pagamento */}
            <div className="secao-checkout">
              <h3 className="secao-titulo">Forma de pagamento</h3>
              <div className="opcoes-pagamento">
                <div
                  className={`opcao-card ${formaPagamento === 'cartao' ? 'ativo' : ''}`}
                  onClick={() => setFormaPagamento('cartao')}
                >
                  <input type="radio" checked={formaPagamento === 'cartao'} readOnly />
                  <div>
                    <strong>Cartão</strong>
                    <p>Crédito ou débito em até 12x sem juros.</p>
                  </div>
                </div>

                <div
                  className={`opcao-card ${formaPagamento === 'pix' ? 'ativo' : ''}`}
                  onClick={() => setFormaPagamento('pix')}
                >
                  <input type="radio" checked={formaPagamento === 'pix'} readOnly />
                  <div>
                    <strong>Pix</strong>
                    <p>Pagamento imediato via QR Code ou chave.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SÓ MOSTRA OS DADOS DO CARTÃO SE 'CARTÃO' ESTIVER SELECIONADO */}
            {formaPagamento === 'cartao' && (
              <div className="secao-checkout">
                <h3 className="secao-titulo">Novo cartão</h3>
                <div className="form-group">
                  <label>Número do cartão</label>
                  <input type="text" placeholder="0000 0000 0000 0000" />
                </div>

                <div className="form-row">
                  <div className="form-group flex-2">
                    <label>Nome impresso</label>
                    <input type="text" placeholder="Como aparece no cartão" />
                  </div>
                  <div className="form-group flex-1">
                    <label>Validade</label>
                    <input type="text" placeholder="MM/AA" />
                  </div>
                  <div className="form-group flex-1">
                    <label>CVV</label>
                    <input type="text" placeholder="123" />
                  </div>
                </div>

                <label className="checkbox-salvar">
                  <input type="checkbox" defaultChecked /> Salvar este cartão para futuras compras
                </label>
              </div>
            )}

            {/* MOSTRA UM AVISO SE 'PIX' ESTIVER SELECIONADO */}
            {formaPagamento === 'pix' && (
              <div className="secao-checkout" style={{ textAlign: 'center', padding: '20px 0' }}>
                <h3 className="secao-titulo">Pagamento via Pix</h3>
                <p style={{ fontSize: 'var(--fonte-apoio)', color: '#7A7A7A' }}>
                  O QR Code e a chave Pix "Copia e Cola" serão gerados na próxima etapa, após você clicar em "Pagar".
                </p>
              </div>
            )}

          </fieldset>
          {/* Endereço */}
          <div className="secao-checkout">
            <h3 className="secao-titulo">Endereço de cobrança e entrega</h3>
            <div className="form-group">
              <label>Nome completo</label>
              <input type="text" placeholder="Nome completo" />
            </div>

            <div className="form-group">
              <label>Endereço</label>
              <input type="text" placeholder="Rua, número, complemento" />
            </div>

            <div className="form-row">
              <div className="form-group flex-2">
                <label>Cidade</label>
                <input type="text" placeholder="Cidade" />
              </div>
              <div className="form-group flex-1">
                <label>Estado</label>
                <input type="text" placeholder="UF" />
              </div>
              <div className="form-group flex-1">
                <label htmlFor="checkout-cep">CEP</label>
                <input id="checkout-cep" type="text" inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" value={cep} onChange={e => { const numeros = e.target.value.replace(/\D/g, '').slice(0, 8); setCep(numeros.length > 5 ? numeros.slice(0, 5) + '-' + numeros.slice(5) : numeros); }} />
              </div>
            </div>
          </div>

          <section className="secao-checkout frete-secao" aria-labelledby="frete-titulo" aria-busy={frete.situacao === 'carregando'}>
            <h3 id="frete-titulo" className="secao-titulo">Entrega</h3>
            <button type="button" className="btn-calcular-frete" disabled={!itens.length || !cepValido(cep) || frete.situacao === 'carregando'} onClick={frete.calcular}>{frete.situacao === 'carregando' ? 'Calculando frete...' : 'Calcular frete'}</button>
            {!cepValido(cep) && <p className="frete-detalhe">Preencha o CEP de entrega acima para calcular.</p>}
            {frete.situacao === 'erro' && <div className="frete-aviso" role="alert">{frete.mensagem}</div>}
            {frete.situacao === 'expirado' && <p className="frete-aviso" role="status">A cotação expirou. Calcule novamente para atualizar os valores.</p>}
            {frete.situacao === 'pronto' && <>
              {frete.cotacao.ambiente === 'sandbox' && <p className="frete-aviso" role="status">Cotação no ambiente de teste da SuperFrete.</p>}
              <fieldset className="frete-opcoes"><legend>Escolha a forma de envio</legend>{frete.cotacao.opcoes.map(opcao => <label className="frete-opcao" key={opcao.id}>
                <input type="radio" name="servico-frete" value={opcao.id} checked={frete.selecionada?.id === opcao.id} onChange={() => frete.selecionar(opcao.id)} />
                <span><strong>{opcao.nome} · {opcao.transportadora}</strong><small>Transporte: {prazo(opcao)}</small></span><strong>{moeda(opcao.precoCentavos)}</strong>
              </label>)}</fieldset>
              {/* <p className="frete-detalhe">Produção das peças: até {frete.cotacao.prazoProducaoDias} dia(s) úteis, além do prazo de transporte. Cotação válida por 10 minutos.</p> ainda nao sabemos se vamos manter isso */}
            </>}
          </section>
          {/* Selo de Segurança e Botão */}
          <div className="banner-seguranca">
            <span className="checkmark">✔</span> Confira o frete antes de finalizar sua encomenda.
          </div>

          <button className="btn-pagar" disabled>Pagamento ainda indisponível</button>
          <p className="rodape-obs">O cálculo de frete não conclui pedidos nem realiza pagamentos.</p>

          {/* O botão de teste de navegação foi removido daqui! */}
        </div>
      </div>
    </div>
  );
}

export default Checkout;
