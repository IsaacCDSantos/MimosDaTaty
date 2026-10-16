import { useEffect, useRef } from 'react'
import './Sobre.css'
import fotoNinhoVerde from '../../assets/imagens/sobre-tati.png'
import fotoBercoRosa from '../../assets/imagens/sobre-atelie.png'

function Sobre() {
  const secaoRef = useRef(null)

  useEffect(() => {
    const secaoAtual = secaoRef.current
    if (!secaoAtual) return

    const elementosAnimados = secaoAtual.querySelectorAll('.animar-rolagem')

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visivel')
          } else if (entrada.boundingClientRect.top > window.innerHeight * 0.75) {
            entrada.target.classList.remove('visivel')
          }
        })
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -75px 0px',
      }
    )

    elementosAnimados.forEach((elemento) => observador.observe(elemento))

    return () => observador.disconnect()
  }, [])

  return (
    <section
      ref={secaoRef}
      className="sobre"
      id="sobre"
      aria-labelledby="sobre-titulo"
    >
      <div className="sobre-container">

        <header className="sobre-cabecalho">
          <div className="sobre-tagline animar-rolagem animar-esquerda">
            <span className="linha-tagline" aria-hidden="true" />
            <span>MIMOS DA TATY</span>
          </div>

          <h2 id="sobre-titulo" className="sobre-titulo animar-rolagem animar-cima atraso-1">
            Sobre mim e meu ateliê
          </h2>

          <p className="sobre-subtitulo animar-rolagem animar-cima atraso-2">
            Um espaço dedicado à paixão pelo feito à mão, ao crochê, ao bordado e aos
            detalhes que transformam cada peça em uma lembrança especial.
          </p>

          <div className="sobre-badge animar-rolagem animar-escala atraso-3">
            <span>Tati · artesã desde 2006</span>
          </div>
        </header>

        <div className="sobre-grid-mosaico">

          <article className="card-conteudo card-quem-sou-eu animar-rolagem animar-card-esquerda">
            <h3 className="card-topico-titulo">Quem sou eu</h3>
            <p className="card-topico-texto">
              Olá! Eu sou a Tati, e desde 2006 sou artesã por paixão e por acreditar no
              poder dos pequenos detalhes. Cada peça que faço é pensada com muito
              carinho, unindo o crochê, o bordado e a magia do feito à mão.
            </p>
          </article>


          <div className="card-foto-wrapper wrapper-foto-verde animar-rolagem animar-card-direita atraso-1">

            <div className="decoracao-pontilhado" aria-hidden="true">
              <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
                <circle cx="12" cy="14" r="1.8" fill="#B37A62" opacity="0.65" />
                <circle cx="26" cy="10" r="2.2" fill="#B37A62" opacity="0.85" />
                <circle cx="40" cy="16" r="1.8" fill="#B37A62" opacity="0.6" />
                <circle cx="54" cy="12" r="2.2" fill="#B37A62" opacity="0.75" />
                <circle cx="18" cy="28" r="2.4" fill="#B37A62" opacity="0.9" />
                <circle cx="32" cy="26" r="1.8" fill="#B37A62" opacity="0.7" />
                <circle cx="48" cy="24" r="1.8" fill="#B37A62" opacity="0.6" />
                <circle cx="62" cy="22" r="2" fill="#B37A62" opacity="0.7" />
                <circle cx="14" cy="42" r="2" fill="#B37A62" opacity="0.65" />
                <circle cx="28" cy="40" r="2.4" fill="#B37A62" opacity="0.85" />
                <circle cx="42" cy="38" r="1.8" fill="#B37A62" opacity="0.6" />
                <circle cx="56" cy="34" r="2.2" fill="#B37A62" opacity="0.75" />
                <circle cx="22" cy="54" r="1.8" fill="#B37A62" opacity="0.6" />
                <circle cx="36" cy="52" r="2.4" fill="#B37A62" opacity="0.8" />
                <circle cx="50" cy="48" r="1.8" fill="#B37A62" opacity="0.6" />
              </svg>
            </div>

            <div className="decoracao-ramo decoracao-ramo-direita" aria-hidden="true">
              <svg width="52" height="62" viewBox="0 0 52 62" fill="none">
                <path
                  d="M6 56C18 46 32 28 46 8"
                  stroke="#A66F53"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M24 38C20 34 16 35 14 38C12 42 17 45 24 38Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M32 26C38 24 40 19 37 17C34 15 30 20 32 26Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M40 16C38 11 33 10 31 13C29 17 35 20 40 16Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M44 10C48 7 50 6 50 4C50 2 46 3 44 10Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>

            <div className="card-foto">
              <img
                src={fotoNinhoVerde}
                alt="Enxoval artesanal ninho trançado verde personalizado Felipe"
                className="imagem-mosaico"
              />
            </div>
          </div>


          <div className="card-foto-wrapper wrapper-foto-rosa animar-rolagem animar-card-esquerda">
            <div className="decoracao-ramo decoracao-ramo-esquerda" aria-hidden="true">
              <svg width="52" height="62" viewBox="0 0 52 62" fill="none">
                <path
                  d="M46 56C34 46 20 28 6 8"
                  stroke="#A66F53"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M28 38C32 34 36 35 38 38C40 42 35 45 28 38Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M20 26C14 24 12 19 15 17C18 15 22 20 20 26Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M12 16C14 11 19 10 21 13C23 17 17 20 12 16Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M8 10C4 7 2 6 2 4C2 2 6 3 8 10Z"
                  stroke="#A66F53"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>

            <div className="card-foto">
              <img
                src={fotoBercoRosa}
                alt="Kit de berço artesanal e almofadas bordadas Luna"
                className="imagem-mosaico"
              />
            </div>
          </div>


          <article className="card-conteudo card-o-atelie animar-rolagem animar-card-direita atraso-1">
            <h3 className="card-topico-titulo">O ateliê</h3>
            <p className="card-topico-texto">
              No ateliê, você encontra enxovais completos para bebê: mantas, toalhas,
              trocadores, kits de berço, saquinhos organizadores e muito mais. Cada peça
              é confeccionada sob medida, com tecidos selecionados e acabamento cuidadoso,
              para durar e acompanhar cada fase do seu bebê.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Sobre
