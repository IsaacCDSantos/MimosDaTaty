import { Link } from 'react-router-dom'
import Header from '../Header/Header'
import '../../paginas/MeuPerfil/MeuPerfil.css'

export function EstruturaContaCliente({
  titulo = 'Meu perfil',
  descricao = 'Seus dados, com todo o cuidado que você merece.',
  classe = '',
  children,
}) {
  return (
    <div className={'meu-perfil-page ' + classe}>
      <Header />
      <main className="meu-perfil-main">
        <p className="meu-perfil-eyebrow">MINHA CONTA</p>
        <h1>{titulo}</h1>
        <p className="meu-perfil-descricao">{descricao}</p>
        {children}
      </main>
      <footer className="meu-perfil-footer">Feito à mão, pensado para você. · Mimos da Tati</footer>
    </div>
  )
}

export function MenuContaCliente({ nomeCompleto = '', atual = 'perfil' }) {
  const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean)
  const iniciais = partes.length
    ? partes.slice(0, 2).map(parte => Array.from(parte)[0]).join('').toLocaleUpperCase('pt-BR')
    : 'MC'
  return (
    <aside className="meu-perfil-sidebar" aria-label="Minha conta">
      <div className="meu-perfil-sidebar-topo">
        <div className="meu-perfil-iniciais" aria-hidden="true">{iniciais}</div>
        <div><h2>{partes.length ? 'Olá, ' + partes[0] + '!' : 'Olá!'}</h2><p>Seu cantinho no ateliê</p></div>
      </div>
      <nav className="meu-perfil-sidebar-nav" aria-label="Navegação da conta">
        <Link to="/meu-perfil" aria-current={atual === 'perfil' ? 'page' : undefined}>Perfil</Link>
        <Link to="/meus-pedidos" aria-current={atual === 'pedidos' ? 'page' : undefined}>Meus pedidos</Link>
        <Link className="meu-perfil-voltar" to="/">Voltar à loja</Link>
      </nav>
    </aside>
  )
}
