import { BrowserRouter } from 'react-router-dom'
import { CarrinhoProvider } from './contextos/CarrinhoContext'
import Rotas from './rotas'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <CarrinhoProvider>
        <Rotas />
      </CarrinhoProvider>
    </BrowserRouter>
  )
}

export default App
