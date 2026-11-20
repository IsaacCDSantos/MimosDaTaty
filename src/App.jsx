import { BrowserRouter } from 'react-router-dom'
import Rotas from './rotas'
import './App.css'
import CarrinhoProvider from './carrinho/CarrinhoProvider'
import SeoDaRota from './componentes/Seo/SeoDaRota'

function App() {
  return (
    <CarrinhoProvider><BrowserRouter>
      <SeoDaRota />
      <Rotas>
      </Rotas>
    </BrowserRouter></CarrinhoProvider>

  )
}

export default App