// O retorno é limitado às rotas internas conhecidas; nunca navegar para um destino arbitrário recebido no state.
export function destinoAposLogin(perfil, origem) {
  if (origem === '/meu-perfil') return '/meu-perfil'
  if (perfil === 'admin') return '/admin'
  return origem === '/checkout' || origem === '/carrinho' ? origem : '/'
}
