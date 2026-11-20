// Título, descrição, endereço canônico e indexação de cada página.
// As tags de compartilhamento (Open Graph) ficam fixas no index.html, porque
// WhatsApp e Instagram não executam JavaScript ao montar a prévia do link.
export const NOME_SITE = 'Mimos da Tati'
export const DESCRICAO_PADRAO = 'Ateliê de enxoval de bebê feito à mão em crochê e bordado: mantas, kits de berço, toalhas, trocadores e peças personalizadas sob encomenda.'

const PAGINAS = [
  { caminho: '/', titulo: `${NOME_SITE} | Enxoval de bebê em crochê e bordado` },
  { caminho: '/catalogo', titulo: 'Catálogo de peças', descricao: 'Veja mantas, kits de berço, toalhas, trocadores e outras peças de enxoval feitas à mão em crochê e bordado. Escolha, personalize e encomende.' },
  { caminho: '/carrinho', titulo: 'Carrinho', privada: true },
  { caminho: '/checkout', titulo: 'Finalizar pedido', privada: true },
  { caminho: '/login', titulo: 'Entrar', privada: true },
  { caminho: '/cadastro', titulo: 'Criar conta', privada: true },
  { caminho: '/recuperar-senha', titulo: 'Recuperar senha', privada: true },
  { caminho: '/confirmacao', titulo: 'Confira seu e-mail', privada: true },
  { caminho: '/redefinir-senha', titulo: 'Redefinir senha', privada: true },
  { caminho: '/meu-perfil', titulo: 'Meu perfil', privada: true },
  { caminho: '/meus-pedidos', titulo: 'Meus pedidos', privada: true },
]

export function montarTitulo(titulo) {
  const texto = typeof titulo === 'string' ? titulo.trim() : ''
  if (!texto) return NOME_SITE
  return texto.includes(NOME_SITE) ? texto : `${texto} | ${NOME_SITE}`
}

// Resumo para buscadores: uma frase curta, sem quebras, com até 160 caracteres.
export function resumirDescricao(texto, limite = 160) {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim()
  if (limpo.length <= limite) return limpo || DESCRICAO_PADRAO
  const corte = limpo.slice(0, limite - 1)
  return corte.slice(0, corte.lastIndexOf(' ') > 80 ? corte.lastIndexOf(' ') : corte.length).replace(/[,.;:]$/, '') + '…'
}

// Devolve null para a página de uma peça: quem define o SEO dela é o catálogo.
export function seoDaRota(caminho) {
  const rota = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho
  if (/^\/catalogo\/[^/]+$/.test(rota)) return null
  if (rota === '/admin' || rota.startsWith('/admin/')) return { titulo: montarTitulo('Painel do ateliê'), descricao: DESCRICAO_PADRAO, indexar: false }
  const pagina = PAGINAS.find(item => item.caminho === rota)
  if (!pagina) return { titulo: montarTitulo(''), descricao: DESCRICAO_PADRAO, indexar: false }
  return { titulo: montarTitulo(pagina.titulo), descricao: pagina.descricao || DESCRICAO_PADRAO, indexar: !pagina.privada }
}

function meta(documento, seletor, criar) {
  let elemento = documento.head.querySelector(seletor)
  if (!elemento) { elemento = criar(); documento.head.appendChild(elemento) }
  return elemento
}

export function aplicarSeo({ titulo, descricao, indexar = true, caminho }, documento = globalThis.document) {
  if (!documento?.head) return
  documento.title = titulo
  meta(documento, 'meta[name="description"]', () => Object.assign(documento.createElement('meta'), { name: 'description' })).content = descricao
  meta(documento, 'meta[name="robots"]', () => Object.assign(documento.createElement('meta'), { name: 'robots' })).content = indexar ? 'index, follow' : 'noindex, nofollow'
  const origem = documento.location?.origin
  if (origem && caminho) meta(documento, 'link[rel="canonical"]', () => Object.assign(documento.createElement('link'), { rel: 'canonical' })).href = origem + caminho
}
