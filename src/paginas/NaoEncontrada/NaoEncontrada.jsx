import { Link, useLocation } from 'react-router-dom'
import Header from '../../componentes/Header/Header'
import './NaoEncontrada.css'

// Mostrada para qualquer endereço que não existe no site (erro 404).
export default function NaoEncontrada() {
  const { pathname } = useLocation()
  return (
    <>
      <Header />
      <main className="nao-encontrada">
        <section className="nao-encontrada-card" aria-labelledby="nao-encontrada-titulo">
          <svg className="nao-encontrada-novelo" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="44" fill="#fcc7c7" stroke="#d99294" strokeWidth="3" />
            <path d="M24 46c22 4 48 22 64 50M30 30c24 10 46 34 54 64M46 18c18 18 32 44 32 74M18 66c26-2 50 10 66 30" fill="none" stroke="#d99294" strokeWidth="3" strokeLinecap="round" />
            <path d="M98 88c8 6 12 14 8 22" fill="none" stroke="#d99294" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="nao-encontrada-codigo">Erro 404</p>
          <h1 id="nao-encontrada-titulo">Página não encontrada</h1>
          <p className="nao-encontrada-texto">
            Parece que esse ponto escapou da agulha. O endereço <code>{pathname}</code> não existe ou foi alterado.
          </p>
          <div className="nao-encontrada-acoes">
            <Link className="nao-encontrada-botao" to="/">Voltar ao início</Link>
            <Link className="nao-encontrada-botao nao-encontrada-botao--contorno" to="/catalogo">Ver o catálogo</Link>
          </div>
        </section>
      </main>
    </>
  )
}
