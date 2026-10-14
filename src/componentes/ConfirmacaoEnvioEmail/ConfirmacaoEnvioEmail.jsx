import { useNavigate } from 'react-router-dom';
import './ConfirmacaoEnvioEmail.css';

function ConfirmacaoEnvioEmail({ aoVoltar }) {
  const navigate = useNavigate();

  const lidarComVoltar = () => {
    if (typeof aoVoltar === 'function') {
      aoVoltar();
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="confirmacao-container">
      <div className="confirmacao-card">
        <div className="icone-email">✉️</div>
        
        <h1 className="confirmacao-titulo">E-mail Enviado!</h1>
        
        <p className="confirmacao-texto">
          As instruções para redefinir a sua senha foram enviadas com sucesso. 
          Por favor, verifique a sua caixa de entrada e também a pasta de spam (lixo eletrônico).
        </p>

        <button className="btn-voltar-login" onClick={lidarComVoltar}>
          Voltar ao login
        </button>
      </div>
    </div>
  );
}

export default ConfirmacaoEnvioEmail;