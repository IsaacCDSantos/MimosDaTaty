import React, { useState } from 'react';
import './Recuperacao.css';

function Recuperacao({ aoVoltar, aoEnviar }) {
  // Estados para guardar o texto do e-mail e possíveis erros
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');

  // Função que verifica o campo antes de avançar
  const lidarComEnvio = () => {
    if (email.trim() === '') {
      setErro('Por favor, introduza o seu e-mail ou utilizador.');
      return; // Bloqueia a execução e não muda de ecrã
    }
    
    // Se o campo estiver preenchido, limpa o erro e avança para a confirmação
    setErro('');
    aoEnviar();
  };

  return (
    <div className="recuperacao-container">
      <div className="decoracao-circulo top-left"></div>
      <div className="decoracao-circulo top-right"></div>
      
      <div className="recuperacao-card">
        <h1 className="recuperacao-titulo">Recuperação</h1>
        <h2 className="recuperacao-subtitulo">Esqueceu sua senha?</h2>
        
        <p className="recuperacao-texto">
          Digite seu e-mail ou usuário cadastrado e enviaremos as instruções para redefinir sua senha.
        </p>

        <div className="input-group">
          <label>E-mail ou usuário</label>
          <div 
            className="input-wrapper" 
            style={{ border: erro ? '1px solid #DE9393' : '1px solid #E6BFA3' }}
          >
            <span className="input-icon">👤</span>
            <input 
              type="text" 
              placeholder="nome@exemplo.com" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (e.target.value) setErro(''); // Limpa o aviso mal o utilizador comece a escrever
              }}
            />
          </div>
          {/* Exibe a mensagem de erro se o estado 'erro' não estiver vazio */}
          {erro && <span style={{ color: '#DE9393', fontSize: '0.8rem', marginTop: '6px', display: 'block' }}>{erro}</span>}
        </div>

        <button className="btn-enviar" onClick={lidarComEnvio}>
          Enviar instruções ➔
        </button>

        <button className="btn-voltar" onClick={aoVoltar}>
          Voltar ao login
        </button>

        <div className="recuperacao-rodape">
          <span className="dot"></span> Acesso seguro e privacidade garantida
        </div>
      </div>
    </div>
  );
}

export default Recuperacao;