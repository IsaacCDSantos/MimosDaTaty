import './Hero.css'
import imagemHero from '../../assets/imagens/banner-principal.png'

function Hero() {
  return (
    <section className="hero-container" id="inicio">
      <img src={imagemHero} alt="Mimos da Taty Hero" className="hero-img" />
      <div className="hero-overlay" aria-hidden="true" />
      <div className="hero-overlay"></div>
      <div className="hero-texto">
        <h1>Mimos da taty</h1>
        <p>
          Bem-vindos ao ateliê Mimos da Taty, onde cada ponto é feito com amor. Criamos enxovais de bebê exclusivos em crochê e bordado, incluindo mantas, toalhas, trocadores, fraldas de boca e de passeio, kits de berço e itens de organização, para transformar o quarto do seu pequeno em um lugar ainda mais especial.
        </p>
        <div className="hero-botao-container">
          <a className="hero-botao" href="#" onClick={(e) => e.preventDefault()}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#cc1e1e">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            Conheça nossas peças
          </a>
        </div>
      </div>
    </section>
  )
}

export default Hero
