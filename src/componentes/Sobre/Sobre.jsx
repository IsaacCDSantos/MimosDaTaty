import './Sobre.css'
import fotoTati from '../../assets/imagens/sobre-tati.png'
import fotoAtelie from '../../assets/imagens/sobre-atelie.png'
import ramoFloral from '../../assets/imagens/ramo-floral-transparente.png'
import coracao from '../../assets/imagens/coracao-transparente.png'

function Sobre() {
  return (
    <section className="sobre" id="sobre" aria-labelledby="sobre-titulo">
      {/* Elemento decorativo floral no canto superior esquerdo */}
      <img
        src={ramoFloral}
        alt=""
        aria-hidden="true"
        className="decoracao-floral"
      />

      {/* Corações decorativos no canto inferior direito */}
      <div className="decoracao-coracoes" aria-hidden="true">
        <img src={coracao} alt="" className="coracao coracao-1" />
        <img src={coracao} alt="" className="coracao coracao-2" />
        <img src={coracao} alt="" className="coracao coracao-3" />
      </div>

      <div className="sobre-container">
        <header className="sobre-cabecalho">
          <h2 id="sobre-titulo" className="sobre-titulo">
            Sobre mim e meu ateliê
          </h2>
          <p className="sobre-subtitulo">
            Um espaço dedicado à paixão pelo feito à mão, ao crochê, ao bordado e aos
            detalhes que transformam cada peça em uma lembrança especial.
          </p>
        </header>

        <div className="sobre-grid">
          {/* Coluna 1: Foto da Tati no topo + Texto Quem sou eu abaixo */}
          <article className="sobre-coluna coluna-tati">
            <div className="card-imagem card-tati">
              <img
                src={fotoTati}
                alt="Tati - Artesã e fundadora do Mimos da Taty"
                className="foto-tati"
              />
            </div>
            <div className="conteudo-texto">
              <h3 className="topico-titulo">Quem sou eu</h3>
              <p className="topico-descricao">
                Olá! Eu sou a Tati, e desde 2006 sou artesã por paixão e por acreditar no
                poder dos pequenos detalhes. Cada peça que faço é pensada com muito
                carinho, unindo o crochê, o bordado e a magia do feito à mão.
              </p>
            </div>
          </article>

          {/* Coluna 2: Texto O ateliê no topo + Foto do Ateliê abaixo */}
          <article className="sobre-coluna coluna-atelie">
            <div className="conteudo-texto">
              <h3 className="topico-titulo">O ateliê</h3>
              <p className="topico-descricao">
                No ateliê, você encontra enxovais completos para bebê: mantas, toalhas,
                trocadores, kits de berço, saquinhos organizadores e muito mais. Cada
                peça é confeccionada sob medida, com tecidos selecionados e acabamento
                cuidadoso, para durar e acompanhar cada fase do seu bebê.
              </p>
            </div>
            <div className="card-imagem card-atelie">
              <img
                src={fotoAtelie}
                alt="Peças artesanais e ambiente do ateliê Mimos da Taty"
                className="foto-atelie"
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export default Sobre
