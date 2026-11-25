import { BrowserRouter } from 'react-router-dom'
import Rotas from './rotas'
import './App.css'
import CarrinhoProvider from './carrinho/CarrinhoProvider'

function App() {
  return (
    <CarrinhoProvider><BrowserRouter>
      <Rotas>
      </Rotas>
    </BrowserRouter></CarrinhoProvider>

  )
}

export default App