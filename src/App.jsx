import './App.css'
import Home from './pages/Home/Home';
import Auth from './pages/Auth/Auth';
function App(){
  const pathname = window.location.pathname.replace(/\/+$/, '');

  if (pathname === '/login' || pathname === '/recuperar-senha') {
    return <Auth recovery={pathname === '/recuperar-senha'} />;
  }

  return (
    <>
    <Home />
    <main>
   
    </main>
    </>
  )
}

export default App
