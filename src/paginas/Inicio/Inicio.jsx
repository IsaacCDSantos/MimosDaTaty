import Header from '../../componentes/Header/Header'
import Hero from '../../componentes/Hero/Hero'
import Beneficios from '../../componentes/Beneficios/Beneficios'
import Sobre from '../../componentes/Sobre/Sobre'
import Contato from '../../componentes/Contato/Contato'

function Inicio({ onAbrirLogin }) {
  return (
    <>
      <Header onAbrirLogin={onAbrirLogin} />
      <Hero />
      <Beneficios />
      <Sobre />
      <Contato />
    </>
  )
}

export default Inicio
