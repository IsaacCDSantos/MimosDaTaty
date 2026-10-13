import { useState, useEffect } from 'react'
import './App.css'
import Inicio from './paginas/Inicio/Inicio'
import Auth from './paginas/Auth/Auth'

function App() {
  const [tela, setTela] = useState(() => {
    const path = window.location.pathname
    if (path === '/login') return 'login'
    if (path === '/recuperar-senha') return 'recuperar'
    return 'inicio'
  })

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      if (path === '/login') setTela('login')
      else if (path === '/recuperar-senha') setTela('recuperar')
      else setTela('inicio')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navegar = (novaTela) => {
    setTela(novaTela)
    const url = novaTela === 'login' ? '/login' : novaTela === 'recuperar' ? '/recuperar-senha' : '/'
    window.history.pushState({}, '', url)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      {tela === 'inicio' && <Inicio onAbrirLogin={() => navegar('login')} />}
      {tela === 'login' && <Auth onNavigate={navegar} />}
      {tela === 'recuperar' && <Auth recovery={true} onNavigate={navegar} />}
    </>
  )
}

export default App
