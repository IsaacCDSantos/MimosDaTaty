import './DestaquesAdmin.css'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numero = new Intl.NumberFormat('pt-BR')

export default function ListaDestaques({ destaques, compacto = false, aoSelecionar }) {
  const Titulo = compacto ? 'h3' : 'h2'
  return (
    <ol className={'destaques-catalogo-lista' + (compacto ? ' destaques-catalogo-lista--compacta' : '')} aria-label="Produtos por número de visualizações">
      {destaques.map((produto, indice) => {
        const conteudo = <>
          <span className="destaques-catalogo-posicao" aria-label={`${indice + 1}º lugar`}>{indice + 1}</span>
          <img className="destaques-catalogo-imagem" src={produto.imagem} alt="" width="96" height="96" loading="lazy" decoding="async" />
          <div className="destaques-catalogo-info">
            <Titulo>{produto.nome}</Titulo>
            <p className="destaques-catalogo-descricao">{produto.descricao}</p>
            <p className="destaques-catalogo-preco">{moeda.format(produto.preco)}</p>
          </div>
          <span className="destaques-catalogo-visualizacoes">{numero.format(produto.visualizacoes)} {produto.visualizacoes === 1 ? 'visualização' : 'visualizações'}</span>
        </>
        return <li key={produto.id}>
          {aoSelecionar
            ? <button className="destaques-catalogo-card destaques-catalogo-card--interativo" type="button" onClick={() => aoSelecionar(produto)} aria-label={`Ver detalhes de ${produto.nome}`}>{conteudo}</button>
            : <article className="destaques-catalogo-card">{conteudo}</article>}
        </li>
      })}
    </ol>
  )
}
