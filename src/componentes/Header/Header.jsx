import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import './Header.css'
import logo from '../../assets/imagens/logo-mimos-da-taty.png'
import ContaHeader from './ContaHeader'

function Header({ onAbrirLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const isScrolledRef = useRef(false)
  const animacaoScrollRef = useRef(null)
  const cabecalhoRef = useRef(null)

  const cancelarAnimacaoScroll = useCallback(() => {
    if (animacaoScrollRef.current !== null) {
      window.cancelAnimationFrame(animacaoScrollRef.current)
      animacaoScrollRef.current = null
    }
  }, [])

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY
          setIsScrolled((prev) => {
            const proximo = !prev && y > 50 ? true : prev && y < 15 ? false : prev
            isScrolledRef.current = proximo
            return proximo
          })
          ticking = false
        })
        ticking = true
      }
    }

    handleScroll()

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('wheel', cancelarAnimacaoScroll, { passive: true })
    window.addEventListener('touchstart', cancelarAnimacaoScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('wheel', cancelarAnimacaoScroll)
      window.removeEventListener('touchstart', cancelarAnimacaoScroll)
      cancelarAnimacaoScroll()
    }
  }, [cancelarAnimacaoScroll])

  // Função de rolagem com início rápido e desaceleração suave progressiva e lenta (ease-out)
  const rolarSuavemente = useCallback((posicaoFinal, duracao = 1600) => {
    cancelarAnimacaoScroll()

    const posicaoInicial = window.scrollY
    const distancia = posicaoFinal - posicaoInicial
    if (Math.abs(distancia) < 4) return

    let inicioTempo = null

    // Curva ease-out quíntica: arranca rápida e tem uma longa e suave desaceleração
    const curvaSuave = (t) => {
      return 1 - Math.pow(1 - t, 5)
    }

    const animarPasso = (tempoAtual) => {
      if (!inicioTempo) inicioTempo = tempoAtual
      const decorrido = tempoAtual - inicioTempo
      const progresso = Math.min(decorrido / duracao, 1)

      window.scrollTo({
        top: posicaoInicial + distancia * curvaSuave(progresso),
        behavior: 'instant',
      })

      if (decorrido < duracao) {
        animacaoScrollRef.current = window.requestAnimationFrame(animarPasso)
      } else {
        animacaoScrollRef.current = null
      }
    }

    animacaoScrollRef.current = window.requestAnimationFrame(animarPasso)
  }, [cancelarAnimacaoScroll])

  const rolarPara = useCallback((id) => {
    const executarRolagem = () => {
      if (id === 'inicio') {
        rolarSuavemente(0, 1500)
        return
      }

      const elemento = document.getElementById(id)
      if (elemento) {
        // Compensa a altura do header fixo para dar respiro visual ao título
        const compensacaoHeader = window.matchMedia('(max-width: 820px)').matches
          ? (cabecalhoRef.current?.getBoundingClientRect().height || 140) + 24
          : isScrolledRef.current ? 88 : 96
        const posicaoDestino = Math.max(0, elemento.getBoundingClientRect().top + window.scrollY - compensacaoHeader)
        const distancia = Math.abs(posicaoDestino - window.scrollY)
        // Duração ampliada para 1400ms - 2000ms para um movimento bem calmo e perceptível
        const duracao = Math.min(Math.max(distancia * 1.1, 1400), 2000)

        rolarSuavemente(posicaoDestino, duracao)
      }
    }

    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(executarRolagem, 150)
      return
    }

    executarRolagem()
  }, [location.pathname, navigate, rolarSuavemente])

  // Executa rolagem suave caso o usuário chegue na página inicial com hash (#sobre ou #contato)
  useEffect(() => {
    if (location.pathname === '/' && location.hash) {
      const id = location.hash.replace('#', '')
      const timer = setTimeout(() => {
        rolarPara(id)
        // Consome o hash após iniciar a rolagem para não re-disparar ao voltar ao topo
        navigate(location.pathname, { replace: true })
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, location.hash, navigate, rolarPara])



  return (
    <div className="site-header-wrapper">
      <header ref={cabecalhoRef} className={`site-header ${isScrolled ? 'scrolled' : ''}`}>
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
                <Link to="/catalogo">Catálogo</Link>
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
            <ContaHeader onEntrar={() => {
                if (onAbrirLogin) onAbrirLogin()
                else navigate('/login')
            }} />
            <a
              href="/carrinho"
              onClick={(e) => {
                e.preventDefault()
                navigate('/carrinho')
              }}
              aria-label="Ir para o carrinho"
            >
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
