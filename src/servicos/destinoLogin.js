// O retorno do frete é uma rota interna conhecida; nunca navegar para um destino arbitrário recebido no state.
export function destinoAposLogin(perfil, origem) {
  if (perfil === 'admin') return '/admin'
  return origem === '/checkout' || origem === '/carrinho' ? origem : '/'
}
