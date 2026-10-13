import React, { useState } from 'react';
import './Checkout.css';

function Checkout({ aoNavegar }) {
  const [formaPagamento, setFormaPagamento] = useState('cartao');

  return (
    <div className="checkout-container">
      {/* Menu Superior */}
      <nav className="checkout-nav">
        <button className="nav-btn">Home</button>
        <button className="nav-btn">Catálogo</button>
        <button className="nav-btn">Sobre Nós</button>
        <button className="nav-btn">Contato</button>
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
              <strong>R$ 407,00</strong>
            </div>
            <div className="resumo-linha">
              <span>Frete</span>
              <strong>R$ 25,00</strong>
            </div>
            <div className="resumo-linha">
              <span>Desconto</span>
              <strong>R$ 0,00</strong>
            </div>
          </div>

          <div className="resumo-total">
            <span>Total</span>
            <span className="valor-total">R$ 432,00</span>
          </div>
          <p className="total-obs">Valor estimado para o envio padrão.</p>

          <button className="btn-editar-carrinho">Editar carrinho</button>
        </div>

        {/* Painel Direito - Formulário Checkout */}
        <div className="card-checkout">
          <h2 className="script-title">Checkout</h2>
          <p className="card-subtitle">
            Confira as informações antes de avançar para a finalização.
          </p>

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
              <p style={{ fontSize: '0.9rem', color: '#7A7A7A' }}>
                O QR Code e a chave Pix "Copia e Cola" serão gerados na próxima etapa, após você clicar em "Pagar".
              </p>
            </div>
          )}

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
                <label>CEP</label>
                <input type="text" placeholder="00000-000" />
              </div>
            </div>
          </div>

          {/* Selo de Segurança e Botão */}
          <div className="banner-seguranca">
            <span className="checkmark">✔</span> Compra segura com criptografia e validação de pagamento.
          </div>

          <button className="btn-pagar">Pagar</button>
          <p className="rodape-obs">A próxima etapa será a confirmação do endereço e do pagamento.</p>
          
          {/* O botão de teste de navegação foi removido daqui! */}
        </div>
      </div>
    </div>
  );
}

export default Checkout;