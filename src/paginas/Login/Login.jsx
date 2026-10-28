import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import imagemAtelie from '../../assets/imagens/banner-principal.png';
import logoMimos from '../../assets/imagens/logo-mimos-da-taty.png';
import './Login.css';
import { supabase } from '../../servicos/supabase'

const MENSAGEM_ACESSO_INVALIDO = 'Alguma das informações não confere. Verifique os dados e tente novamente.';

function Icon({ name, ...props }) {
  const paths = {
    user: <><circle cx="12" cy="7" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    shield: <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 5.1A11.5 11.5 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 3.8M6.3 6.3A18 18 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.7-1.5" /><path d="M10 10a3 3 0 0 0 4 4" /></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function DecorativeHeart({ className }) {
  const id = useId();

  return (
    <svg className={className} viewBox="0 0 64 58" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-fill`} cx="46%" cy="36%" r="68%">
          <stop offset="0" stopColor="#ffe4b8" />
          <stop offset=".57" stopColor="#ffb391" />
          <stop offset="1" stopColor="#e78072" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="2" dy="3" stdDeviation="1.3" floodColor="#805747" floodOpacity=".5" />
        </filter>
      </defs>
      <g filter={`url(#${id}-shadow)`}>
        <path d="M32 53C25 46 4 31 4 18 4 2 25-1 32 13 39-1 60 2 60 18 60 31 39 46 32 53Z" fill={`url(#${id}-fill)`} stroke="#ac7458" strokeWidth="1.6" />
        <path d="M32 48C24 40 9 29 9 18 9 8 24 5 32 20 40 5 55 8 55 18 55 29 40 40 32 48Z" fill="none" stroke="#ffd9a5" strokeWidth="1.6" />
        <path d="M12 16c0-5 8-7 12-1" fill="none" stroke="#fff1d8" strokeWidth="3.5" strokeLinecap="round" opacity=".8" />
        <path d="M38 43c6-5 12-10 15-16" fill="none" stroke="#d47d67" strokeWidth="1.5" opacity=".5" />
      </g>
    </svg>
  );
}

export default function Login({ recovery = false, onNavigate }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => new URLSearchParams(window.location.search).get('perfil') === 'admin' ? 'admin' : 'cliente');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [enviando, setEnviando] = useState(false);
  const profileQuery = profile === 'admin' ? '?perfil=admin' : '';
  const isAdmin = profile === 'admin';

  function selectProfile(nextProfile) {
    if (enviando) return;
    if (nextProfile === profile) return;
    setProfile(nextProfile);
    setPassword('');
    setShowPassword(false);
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (enviando) return;
    setNotice('');

    if (recovery) {
      setNotice('A recuperação de senha ainda não está disponível.');
      return;
    }

    if (!username.trim() || !password) {
      setNotice('Informe seu e-mail e sua senha.');
      return;
    }

    if (!supabase) {
      setNotice('O login está temporariamente indisponível. Tente novamente mais tarde.');
      return;
    }

    setEnviando(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password: password,
      });

      if (error) {
        if (error.status === 429) {
          setNotice('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        } else if (error.name === 'AuthRetryableFetchError' || error.status >= 500) {
          setNotice('Não foi possível conectar. Tente novamente.');
        } else {
          setNotice(MENSAGEM_ACESSO_INVALIDO);
        }
        return;
      }

      const { data: dadosPerfil, error: erroPerfil } = await supabase
        .from('perfis')
        .select('perfil')
        .eq('id', data.user.id)
        .single();

      if (erroPerfil || !dadosPerfil) {
        const { error: erroSaida } = await supabase.auth.signOut({ scope: 'local' });
        if (erroSaida) throw erroSaida;
        setNotice(MENSAGEM_ACESSO_INVALIDO);
        return;
      }

      if (dadosPerfil.perfil !== profile) {
        const { error: erroSaida } = await supabase.auth.signOut({ scope: 'local' });
        if (erroSaida) throw erroSaida;
        setNotice(MENSAGEM_ACESSO_INVALIDO);
        return;
      }

      navigate(
        dadosPerfil.perfil === 'admin' ? '/admin' : '/',
        { replace: true }
      );
    } catch {
      setNotice('Não foi possível conectar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  function renderFormPane(paneProfile) {
    const isPaneActive = recovery ? paneProfile === 'cliente' : profile === paneProfile;
    const isPaneAdmin = paneProfile === 'admin';
    const prefix = `auth-${paneProfile}`;

    return (
      <div
        className={`auth-pane auth-pane--${paneProfile}${isPaneActive ? ' auth-pane--active' : ''}`}
        aria-hidden={!isPaneActive}
      >
        <div className="auth-pane-inner">
          <span className="auth-badge">
            <Icon name={isPaneAdmin ? 'shield' : 'heart'} />
            {isPaneAdmin ? 'Gestão do Ateliê' : 'Espaço do Cliente'}
          </span>

          <h1 id={!isPaneAdmin ? 'auth-title' : undefined} className="auth-title">
            {recovery ? 'Recuperação' : 'Entrar'}
          </h1>

          {recovery ? (
            <div className="auth-intro">
              <p className="auth-subtitle">Esqueceu sua senha?</p>
              <p className="auth-description">
                Digite seu e-mail e enviaremos as instruções para redefinir sua senha.
              </p>
            </div>
          ) : (
            <>
              <p className="auth-welcome">
                {isPaneAdmin
                  ? 'Acesse o painel administrativo para gerenciar encomendas, catálogo e clientes.'
                  : 'Que alegria ter você aqui! Entre para acompanhar seus pedidos e mimos especiais.'}
              </p>

              <div className="auth-profiles" role="group" aria-label="Perfil de acesso">
                <button
                  className={`auth-profile${profile === 'cliente' ? ' auth-profile--active' : ''}`}
                  type="button"
                  tabIndex={isPaneActive ? 0 : -1}
                  aria-pressed={profile === 'cliente'}
                  onClick={() => selectProfile('cliente')}
                >
                  <Icon name="heart" /> Cliente
                </button>
                <button
                  className={`auth-profile${profile === 'admin' ? ' auth-profile--active' : ''}`}
                  type="button"
                  tabIndex={isPaneActive ? 0 : -1}
                  aria-pressed={profile === 'admin'}
                  onClick={() => selectProfile('admin')}
                >
                  <Icon name="shield" /> Admin
                </button>
              </div>
            </>
          )}

          <form className="auth-form" onSubmit={handleSubmit} onChange={() => setNotice('')}>
            <div className="auth-field">
              <label htmlFor={`${prefix}-username`}>
                {recovery ? 'E-mail ou usuário' : isPaneAdmin ? 'E-mail administrativo' : 'E-mail'}
              </label>
              <div className="auth-input-wrap">
                <Icon name="user" />
                <input
                  id={`${prefix}-username`}
                  name="username"
                  type="email"
                  tabIndex={isPaneActive ? 0 : -1}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={isPaneAdmin ? 'admin@mimosdataty.com' : 'nome@exemplo.com'}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  aria-describedby={notice && isPaneActive ? `${prefix}-notice` : undefined}
                />
              </div>
            </div>

            {!recovery && (
              <>
                <div className="auth-field auth-field--password">
                  <label htmlFor={`${prefix}-password`}>Senha</label>
                  <div className="auth-input-wrap">
                    <Icon name="lock" />
                    <input
                      id={`${prefix}-password`}
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      tabIndex={isPaneActive ? 0 : -1}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      aria-describedby={notice && isPaneActive ? `${prefix}-notice` : undefined}
                    />
                    <button
                      className="auth-password-toggle"
                      type="button"
                      tabIndex={isPaneActive ? 0 : -1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                    </button>
                  </div>
                </div>
                <a
                  className="auth-forgot"
                  href="/recuperacao"
                  tabIndex={isPaneActive ? 0 : -1}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/recuperacao');
                  }}
                >
                  Esqueceu a senha?
                </a>
              </>
            )}

            <button className="auth-submit" type="submit" disabled={enviando} aria-busy={enviando} tabIndex={isPaneActive ? 0 : -1}>
              {recovery ? 'Enviar instruções' : isPaneAdmin ? 'Entrar como Admin' : 'Entrar'} <Icon name="arrow" />
            </button>

            {recovery && (
              <a
                className="auth-back"
                href={`/login${profileQuery}`}
                tabIndex={isPaneActive ? 0 : -1}
                onClick={(e) => {
                  e.preventDefault();
                  if (onNavigate) onNavigate('login');
                  else navigate(`/login${profileQuery}`);
                }}
              >
                Voltar ao login
              </a>
            )}

            {!recovery && !isPaneAdmin && (
              <p className="auth-signup">
                Ainda não tem uma conta?{' '}
                <Link to="/cadastro" tabIndex={isPaneActive ? 0 : -1}>Criar conta</Link>
              </p>
            )}

            {notice && isPaneActive && (
              <p id={`${prefix}-notice`} className="auth-notice" role="status">
                {notice}
              </p>
            )}

            <a
              className="auth-back auth-back--home"
              href="/"
              tabIndex={isPaneActive ? 0 : -1}
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate('inicio');
                else navigate('/');
              }}
            >
              ← Voltar ao início
            </a>
          </form>

          <p className="auth-privacy">
            <span aria-hidden="true" /> Acesso seguro e privacidade garantida
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className={`auth-page${isAdmin ? ' auth-page--admin' : ''}`} lang="pt-BR">
      <div className="auth-corner auth-corner--left" aria-hidden="true" />
      <div className="auth-corner auth-corner--right" aria-hidden="true" />
      <div className="auth-hearts" aria-hidden="true">
        <DecorativeHeart className="auth-heart auth-heart--large" />
        <DecorativeHeart className="auth-heart auth-heart--small" />
        <DecorativeHeart className="auth-heart auth-heart--medium" />
      </div>
      <div className="auth-border" aria-hidden="true" />

      <section
        className={`auth-card${recovery ? ' auth-card--recovery' : ''}${isAdmin && !recovery ? ' auth-card--admin' : ''}`}
        aria-labelledby="auth-title"
      >
        <div className="auth-split">
          {renderFormPane('cliente')}
          {!recovery && renderFormPane('admin')}
        </div>

        {!recovery && (
          <aside className="auth-visual-overlay" aria-hidden="true">
            <div className="auth-visual-track">
              <img
                src={imagemAtelie}
                alt="Bonequinha de crochê e linhas do ateliê Mimos da Taty"
                className="auth-visual-img"
              />
              <div className="auth-visual-gradient" />

              <div className="auth-visual-content">
                <div className="auth-visual-top">
                  <img src={logoMimos} alt="" className="auth-visual-logo" />
                  <span className="auth-visual-tag">Ateliê Mimos da Taty</span>
                </div>

                <div className="auth-visual-Quote">
                  <h2 className="auth-visual-heading">
                    {isAdmin ? 'Amor em cada detalhe artesanal' : 'Cada ponto feito com muito amor'}
                  </h2>
                  <p className="auth-visual-text">
                    {isAdmin
                      ? 'Organize pedidos, acompanhe a produção do ateliê e cuide de cada enxoval com carinho.'
                      : 'Enxovais personalizados em crochê e bordado para tornar cada momento do seu bebê único.'}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}

