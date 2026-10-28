import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cadastrarCliente } from '../../servicos/cadastro';
import imagemAtelie from '../../assets/imagens/banner-principal.png';
import logoMimos from '../../assets/imagens/logo-mimos-da-taty.png';
import './Cadastro.css';

export default function Cadastro() {
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const envioEmAndamento = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (envioEmAndamento.current) return;

    const form = event.currentTarget;
    const campos = new FormData(form);
    const nome = campos.get('nome').trim();
    const email = campos.get('email').trim();
    const senha = campos.get('senha');

    if (nome.length < 2) {
      setErro('Informe seu nome com pelo menos dois caracteres.');
      form.elements.nome.focus();
      return;
    }
    if (senha !== campos.get('confirmacaoSenha')) {
      setErro('As senhas não coincidem. Confira a confirmação da senha.');
      form.elements.confirmacaoSenha.focus();
      return;
    }

    envioEmAndamento.current = true;
    setEnviando(true);
    setErro('');
    try {
      const resposta = await cadastrarCliente({ nome, email, senha });
      form.reset();
      setMostrarSenhas(false);
      setResultado(resposta);
    } catch (error) {
      setErro(error.message || 'Não foi possível concluir o cadastro. Tente novamente.');
    } finally {
      envioEmAndamento.current = false;
      setEnviando(false);
    }
  }

  return (
    <main className="cadastro-page" lang="pt-BR">
      <section className="cadastro-card" aria-labelledby="cadastro-titulo">
        <div className="cadastro-conteudo">
          <span className="cadastro-badge">♡ Espaço do Cliente</span>
          <h1 id="cadastro-titulo">Criar conta</h1>
          <p className="cadastro-intro">Faça parte do nosso cantinho de carinho e mimos feitos à mão.</p>

          {resultado ? (
            <div className="cadastro-sucesso" role="status">
              <h2>{resultado.confirmarEmail ? 'Confira seu e-mail' : 'Conta criada!'}</h2>
              <p>{resultado.confirmarEmail
                ? 'Se o cadastro puder ser realizado com este endereço, você receberá um e-mail para confirmar sua conta. Confira também a pasta de spam. Se já tiver uma conta, entre ou recupere sua senha.'
                : 'Seu cadastro foi concluído com sucesso. Que alegria ter você por aqui!'}</p>
              <Link className="cadastro-botao" to="/login">Voltar ao login</Link>
            </div>
          ) : (
            <form className="cadastro-form" onSubmit={handleSubmit} onChange={() => setErro('')} aria-busy={enviando}>
              <fieldset disabled={enviando}>
                <legend className="cadastro-sr-only">Dados da nova conta</legend>
                <div className="cadastro-campo">
                  <label htmlFor="cadastro-nome">Nome</label>
                  <input id="cadastro-nome" name="nome" type="text" autoComplete="name" placeholder="Como podemos chamar você?" minLength={2} maxLength={120} required />
                </div>
                <div className="cadastro-campo">
                  <label htmlFor="cadastro-email">E-mail</label>
                  <input id="cadastro-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="nome@exemplo.com" required />
                </div>
                <div className="cadastro-campo">
                  <label htmlFor="cadastro-senha">Senha</label>
                  <input id="cadastro-senha" name="senha" type={mostrarSenhas ? 'text' : 'password'} autoComplete="new-password" placeholder="Crie uma senha" minLength={8} aria-describedby="cadastro-senha-ajuda" required />
                  <p id="cadastro-senha-ajuda" className="cadastro-ajuda">Use pelo menos 8 caracteres.</p>
                </div>
                <div className="cadastro-campo">
                  <label htmlFor="cadastro-confirmacao">Confirmar senha</label>
                  <input id="cadastro-confirmacao" name="confirmacaoSenha" type={mostrarSenhas ? 'text' : 'password'} autoComplete="new-password" placeholder="Digite a senha novamente" minLength={8} required />
                </div>
                <label className="cadastro-mostrar">
                  <input type="checkbox" checked={mostrarSenhas} onChange={(event) => setMostrarSenhas(event.target.checked)} />
                  Mostrar senhas
                </label>
                <button className="cadastro-botao" type="submit">{enviando ? 'Criando conta…' : 'Criar minha conta'}</button>
              </fieldset>
              {erro && <p className="cadastro-erro" role="alert">{erro}</p>}
            </form>
          )}

          {!resultado && <p className="cadastro-login">Já tem uma conta? <Link to="/login">Entrar</Link></p>}
          <Link className="cadastro-voltar" to="/">← Voltar ao início</Link>
        </div>
        <aside className="cadastro-visual" aria-hidden="true">
          <img className="cadastro-imagem" src={imagemAtelie} alt="" />
          <div className="cadastro-marca"><img src={logoMimos} alt="" /><span>Ateliê Mimos da Taty</span></div>
          <div className="cadastro-mensagem">
            <h2>Cada ponto feito com muito amor</h2>
            <p>Um cantinho especial para acolher você e os momentos mais doces do seu bebê.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
