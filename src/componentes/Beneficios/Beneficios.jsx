import './Beneficios.css'
import iconeFeitoAMao from '../../assets/imagens/01-icone-feito-a-mao.png'
import iconeEntregaSegura from '../../assets/imagens/02-icone-entrega-segura.png'
import iconePagamento from '../../assets/imagens/03-icone-pagamento.png'
import iconeAtendimento from '../../assets/imagens/04-icone-atendimento.png'

const listaBeneficios = [
  { icone: iconeFeitoAMao, titulo: 'Feito à mão', descricao: 'Cada peça é única e com muito carinho' },
  { icone: iconeEntregaSegura, titulo: 'Entrega segura', descricao: 'Entregamos para todo o país' },
  { icone: iconePagamento, titulo: 'Pagamento facilitado', descricao: 'Diversas formas de pagamento' },
  { icone: iconeAtendimento, titulo: 'Atendimento especial', descricao: 'Tire suas dúvidas e faça seu pedido' },
]

function Beneficios() {
  return (
    <section className="beneficios" id="beneficios" aria-label="Diferenciais da Mimos da Taty">
      <div className="card-beneficios">
        {listaBeneficios.map(({ icone, titulo, descricao }) => (
          <article className="item-beneficio" key={titulo}>
            <img src={icone} alt="" />
            <h2>{titulo}</h2>
            <p>{descricao}</p>
          </article>
        ))}
      </div>

      {/* Divisória de crochê separando a seção de Benefícios da próxima seção */}
      <div className="beneficios-borda-croche" aria-hidden="true">
        <svg width="100%" height="28" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="padrao-croche-beneficios"
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
          <rect width="100%" height="28" fill="url(#padrao-croche-beneficios)" />
        </svg>
      </div>
    </section>
  )
}

export default Beneficios
