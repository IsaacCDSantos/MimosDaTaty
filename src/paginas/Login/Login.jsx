import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

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
  const profileQuery = profile === 'admin' ? '?perfil=admin' : '';

  function selectProfile(nextProfile) {
    setProfile(nextProfile);
    setPassword('');
    setShowPassword(false);
    setNotice('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim()) {
      setNotice('Informe seu e-mail ou usuário.');
      event.currentTarget.elements.username.focus();
      return;
    }

    // A interface não autentica nem envia e-mails sem um serviço conectado.
    setNotice(recovery
      ? 'A recuperação de senha ainda não está disponível. Tente novamente em breve.'
      : 'O acesso ainda não está disponível. Tente novamente em breve.');
  }

  return (
    <main className={`auth-page${profile === 'admin' ? ' auth-page--admin' : ''}`} lang="pt-BR">
      <div className="auth-corner auth-corner--left" aria-hidden="true" />
      <div className="auth-corner auth-corner--right" aria-hidden="true" />
      <div className="auth-hearts" aria-hidden="true">
        <DecorativeHeart className="auth-heart auth-heart--large" />
        <DecorativeHeart className="auth-heart auth-heart--small" />
        <DecorativeHeart className="auth-heart auth-heart--medium" />
      </div>
      <div className="auth-border" aria-hidden="true" />

      <section className={`auth-card${recovery ? ' auth-card--recovery' : ''}`} aria-labelledby="auth-title">
        <h1 id="auth-title" className="auth-title">{recovery ? 'Recuperação' : 'Entrar'}</h1>

        {recovery ? (
          <div className="auth-intro">
            <p className="auth-subtitle">Esqueceu sua senha?</p>
            <p className="auth-description">Digite seu e-mail ou usuário cadastrado e enviaremos as instruções para redefinir sua senha.</p>
          </div>
        ) : (
          <div className="auth-profiles" role="group" aria-label="Perfil de acesso">
            <button className={`auth-profile${profile === 'cliente' ? ' auth-profile--active' : ''}`} type="button" aria-pressed={profile === 'cliente'} onClick={() => selectProfile('cliente')}>
              <Icon name="heart" /> Cliente
            </button>
            <button className={`auth-profile${profile === 'admin' ? ' auth-profile--active' : ''}`} type="button" aria-pressed={profile === 'admin'} onClick={() => selectProfile('admin')}>
              <Icon name="shield" /> Admin
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} onChange={() => setNotice('')}>
          <div className="auth-field">
            <label htmlFor="auth-username">{recovery ? 'E-mail ou usuário' : 'Usuário'}</label>
            <div className="auth-input-wrap">
              <Icon name="user" />
              <input id="auth-username" name="username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="nome@exemplo.com" autoComplete="username" autoCapitalize="none" spellCheck={false} required aria-describedby={notice ? 'auth-notice' : undefined} />
            </div>
          </div>

          {!recovery && (
            <>
              <div className="auth-field auth-field--password">
                <label htmlFor="auth-password">Senha</label>
                <div className="auth-input-wrap">
                  <Icon name="lock" />
                  <input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" required aria-describedby={notice ? 'auth-notice' : undefined} />
                  <button className="auth-password-toggle" type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                  </button>
                </div>
              </div>
              <a
                className="auth-forgot"
                href="/recuperacao"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/recuperacao');
                }}
              >
                Esqueceu a senha?
              </a>
            </>
          )}

          <button className="auth-submit" type="submit">{recovery ? 'Enviar instruções' : 'Entrar'} <Icon name="arrow" /></button>

          {recovery && (
            <a
              className="auth-back"
              href={`/login${profileQuery}`}
              onClick={(e) => {
                e.preventDefault();
                if (onNavigate) onNavigate('login');
                else navigate(`/login${profileQuery}`);
              }}
            >
              Voltar ao login
            </a>
          )}
          {notice && <p id="auth-notice" className="auth-notice" role="status">{notice}</p>}
          <a
            className="auth-back"
            href="/"
            style={{ marginTop: '14px', opacity: 0.8 }}
            onClick={(e) => {
              e.preventDefault();
              if (onNavigate) onNavigate('inicio');
              else navigate('/');
            }}
          >
            ← Voltar ao início
          </a>
        </form>

        <p className="auth-privacy"><span aria-hidden="true" /> Acesso seguro e privacidade garantida</p>
      </section>
    </main>
  );
}
