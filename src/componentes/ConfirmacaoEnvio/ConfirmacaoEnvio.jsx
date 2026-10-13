import React from 'react';
import './ConfirmacaoEnvio.css';

function ConfirmacaoEnvio({ aoVoltar }) {
  return (
    <div className="confirmacao-container">
      <div className="confirmacao-card">
        <div className="icone-email">✉️</div>
        
        <h1 className="confirmacao-titulo">E-mail Enviado!</h1>
        
        <p className="confirmacao-texto">
          As instruções para redefinir a sua senha foram enviadas com sucesso. 
          Por favor, verifique a sua caixa de entrada e também a pasta de spam (lixo eletrônico).
        </p>

        <button className="btn-voltar-login" onClick={aoVoltar}>
          Voltar ao login
        </button>
      </div>
    </div>
  );
}

export default ConfirmacaoEnvio;