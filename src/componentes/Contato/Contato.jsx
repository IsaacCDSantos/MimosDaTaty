import './Contato.css'
import bannerContato from '../../assets/imagens/banner-contato.png'
import iconeWhatsapp from '../../assets/imagens/whatsapp-icon.svg'
import iconeInstagram from '../../assets/imagens/instagram-icon.svg'
import bonequinha from '../../assets/imagens/06-bonequinha.png'
import coracao from '../../assets/imagens/coracao-transparente.png'

function Contato() {
  return (
    <section className="contato-secao" id="contato" aria-labelledby="contato-titulo">
      <div className="contato-container">
        {/* Cabeçalho da Seção (Harmonia com o padrão editorial da seção 'Sobre') */}
        <header className="contato-cabecalho">
          <div className="contato-tagline">
            <span className="linha-tagline" aria-hidden="true" />
            <span>MIMOS DA TATY · CONTATO & ENCOMENDAS</span>
          </div>

          <h2 id="contato-titulo" className="contato-titulo">
            Vamos conversar?
          </h2>

          <p className="contato-subtitulo">
            Tire suas dúvidas, solicite um orçamento personalizado ou venha acompanhar de
            pertinho a confecção de cada mimo para o seu bebê.
          </p>
        </header>

        {/* Card Hero Panorâmico (Emoldurado dentro da grade de 1140px do site) */}
        <div className="contato-hero-card">
          <img
            src={bannerContato}
            alt="Pequenos detalhes fazem grandes histórias... Aqui é onde a delicadeza encontra você."
            className="contato-hero-img"
          />
        </div>

        {/* Grade de Cards de Ação (WhatsApp e Instagram) */}
        <div className="contato-grid">
          {/* Card WhatsApp */}
          <article className="contato-card card-whatsapp">
            <div className="contato-card-header">
              <div className="contato-icone-container icone-whatsapp" aria-hidden="true">
                <img src={iconeWhatsapp} alt="" className="icone-social icone-whatsapp-img" />
              </div>
              <span className="contato-badge-status badge-whatsapp">
                <span className="ponto-status ponto-verde" aria-hidden="true" />
                Atendimento Direto
              </span>
            </div>

            <div className="contato-conteudo">
              <h3 className="contato-card-titulo">WhatsApp</h3>
              <p className="contato-card-texto">
                Fale diretamente com a Tati para tirar dúvidas, escolher tecidos, personalizar
                bordados e solicitar seu orçamento sob medida.
              </p>
            </div>

            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="contato-botao botao-whatsapp"
              aria-label="Conversar pelo WhatsApp (abre em nova aba)"
            >
              <span>Conversar no WhatsApp</span>
              <svg className="icone-seta" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </article>

          {/* Card Instagram */}
          <article className="contato-card card-instagram">
            <div className="contato-card-header">
              <div className="contato-icone-container icone-instagram" aria-hidden="true">
                <img src={iconeInstagram} alt="" className="icone-social icone-instagram-img" />
              </div>
              <span className="contato-badge-status badge-instagram">
                <span className="ponto-status ponto-rosa" aria-hidden="true" />
                Bastidores & Novidades
              </span>
            </div>

            <div className="contato-conteudo">
              <h3 className="contato-card-titulo">Instagram</h3>
              <p className="contato-card-texto">
                Acompanhe a rotina do ateliê, fotos de peças prontas, lançamentos exclusivos e
                relatos de mães apaixonadas pelo feito à mão.
              </p>
            </div>

            <a
              href="https://instagram.com/mimosdataty"
              target="_blank"
              rel="noopener noreferrer"
              className="contato-botao botao-instagram"
              aria-label="Ver perfil no Instagram (abre em nova aba)"
            >
              <span>Seguir no Instagram</span>
              <svg className="icone-seta" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </article>
        </div>

        {/* Faixa Informativa de Atendimento Acolhedor */}
        <div className="contato-info-wrapper">
          <div className="contato-info-atendimento">
            <span className="info-icone" aria-hidden="true">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <p className="contato-horario">
              Horário de atendimento: <strong>segunda a sábado, das 9h às 18h</strong>
            </p>
          </div>
        </div>

        {/* Rodapé e Copyright */}
        <footer className="contato-rodape">
          <p className="contato-copyright">
            © 2026 Mimos da Taty · Feito à mão com carinho · Todos os direitos reservados.
          </p>
        </footer>

        {/* Assinatura com a Bonequinha e Corações */}
        <div className="contato-decoracao-boneca" aria-hidden="true">
          <img src={coracao} alt="" className="decoracao-coracao coracao-1" />
          <img src={coracao} alt="" className="decoracao-coracao coracao-2" />
          <img src={bonequinha} alt="" className="decoracao-bonequinha" />
        </div>
      </div>
    </section>
  )
}

export default Contato
