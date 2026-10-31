import { useEffect, useRef } from 'react'
import CartaAnimada from './CartaAnimada'
import costura from '../../assets/recuperacao/costura.svg'
import cadeado from '../../assets/recuperacao/cadeado.svg'
import email from '../../assets/recuperacao/email.svg'
import confirmado from '../../assets/recuperacao/confirmado.svg'
import privacidade from '../../assets/recuperacao/privacidade.svg'
import './RecuperacaoLayout.css'

const icones = { cadeado, email, confirmado }

export default function RecuperacaoLayout({ titulo, subtitulo, descricao, icone = 'cadeado', seguro = true, children }) {
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [titulo])

  return (
    <main className="senha-page" lang="pt-BR">
      <section className="senha-card" aria-labelledby="senha-titulo">
        <aside className="senha-arte" aria-label="Mimos da Taty">
          <div className="senha-marca"><p>Mimos da Taty</p><span>FEITO À MÃO, COM AMOR</span></div>
          <CartaAnimada />
          <div className="senha-mensagem"><p>Um novo começo,<br />com o mesmo carinho.</p><span>Seu acesso aos nossos mimos está logo ali.</span></div>
          <img className="senha-costura" src={costura} width="440" height="4" alt="" />
        </aside>
        <div className="senha-painel">
          <div className="senha-conteudo">
            <p className="senha-demo" role="note">Demonstração visual: nenhum e-mail é enviado e nenhuma senha é alterada.</p>
            <span className="senha-simbolo" aria-hidden="true"><img src={icones[icone]} width="28" height="28" alt="" /></span>
            <h1 id="senha-titulo" className="senha-titulo" ref={heading} tabIndex={-1}>{titulo}</h1>
            <h2 className="senha-subtitulo">{subtitulo}</h2>
            <p className="senha-descricao">{descricao}</p>
            {children}
            {seguro && <p className="senha-privacidade"><img src={privacidade} width="15" height="15" alt="" />Seus dados estão protegidos</p>}
          </div>
        </div>
      </section>
    </main>
  )
}
