import { useState, useEffect } from 'react'
import './Header.css'
import logo from '../../assets/imagens/logo-mimos-da-taty.png'

function Header({ onAbrirLogin }) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY
          // Histerese inteligente: ativa suavemente após rolar mais de 50px,
          // e só volta ao estado expandido se o usuário retornar bem perto do topo (< 15px).
          setIsScrolled((prev) => {
            if (!prev && y > 50) return true
            if (prev && y < 15) return false
            return prev
          })
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const rolarPara = (id) => {
    if (id === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const elemento = document.getElementById(id)
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="site-header-wrapper">
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-conteudo">
          <div className="marca">
            <a
              href="#inicio"
              onClick={(e) => {
                e.preventDefault()
                rolarPara('inicio')
              }}
              aria-label="Voltar ao início"
            >
              <img src={logo} alt="Mimos da Taty" />
            </a>
          </div>

          <nav aria-label="Navegação principal">
            <ul>
              <li>
                <a
                  href="#inicio"
                  onClick={(e) => {
                    e.preventDefault()
                    rolarPara('inicio')
                  }}
                >
                  Início
                </a>
              </li>
              <li>
                <a
                  href="#catalogo"
                  onClick={(e) => {
                    e.preventDefault()
                    rolarPara('catalogo')
                  }}
                >
                  Catálogo
                </a>
              </li>
              <li>
                <a
                  href="#sobre"
                  onClick={(e) => {
                    e.preventDefault()
                    rolarPara('sobre')
                  }}
                >
                  Sobre Nós
                </a>
              </li>
              <li>
                <a
                  href="#contato"
                  onClick={(e) => {
                    e.preventDefault()
                    rolarPara('contato')
                  }}
                >
                  Contato
                </a>
              </li>
            </ul>
          </nav>

          <div className="header-acoes">
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault()
                if (onAbrirLogin) onAbrirLogin()
              }}
              aria-label="Entrar na conta"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M5.5 19c.4-3.2 2.85-5.5 6.5-5.5s6.1 2.3 6.5 5.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>Login</span>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} aria-label="Carrinho: R$ 0,00">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M1 2h4l2.68 12.39A2 2 0 0 0 9.68 16H19.4a2 2 0 0 0 2-1.61L23 6H6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="21" r="1" fill="currentColor" />
                <circle cx="20" cy="21" r="1" fill="currentColor" />
              </svg>
              <span>R$0,00</span>
            </a>
          </div>
        </div>

        <div className="borda-croche" aria-hidden="true">
          <svg width="100%" height="28" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="padrao-croche"
                x="0"
                y="0"
                width="36"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <rect x="0" y="0" width="36" height="10" fill="#CF8487" />
                <circle cx="18" cy="10" r="18" fill="#CF8487" />
              </pattern>
            </defs>
            <rect width="100%" height="28" fill="url(#padrao-croche)" />
          </svg>
        </div>
      </header>
    </div>
  )
}

export default Header
