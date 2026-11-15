export const CATEGORIAS_CATALOGO = Object.freeze([
  'Maternidade',
  'Enxovais',
  'Crochê & Bordado',
  'Presentes',
])

const nomesImagensExistentes = [
  'kit_berco_florido_figma',
  'manta_croche_bebe_figma',
  'trocador_croche_figma',
]

function exigirLista(lista) {
  if (!Array.isArray(lista)) throw new Error('A lista de peças é inválida.')
}

function chaveId(id) {
  if (typeof id === 'number' && Number.isSafeInteger(id) && id >= 0) return String(id)
  if (typeof id === 'string' && id.trim()) return id.trim()
  throw new Error('Informe um identificador válido para a peça.')
}

function encontrarIndice(lista, id) {
  exigirLista(lista)
  const chave = chaveId(id)
  const indice = lista.findIndex(peca => chaveId(peca?.id) === chave)
  if (indice < 0) throw new Error('A peça não foi encontrada no catálogo.')
  return indice
}

function exigirTexto(valor, campo) {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new Error('Preencha ' + campo + '.')
  }
  return valor.trim()
}

function normalizarPreco(valor) {
  let numero = valor
  if (typeof valor === 'string') {
    const texto = valor.trim().replace(/^R\$\s*/i, '')
    if (/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(texto)) {
      numero = Number(texto.replace(/\./g, '').replace(',', '.'))
    } else if (/^\d+(?:\.\d{1,2})?$/.test(texto)) {
      numero = Number(texto)
    } else {
      throw new Error('Informe um preço positivo com no máximo duas casas decimais.')
    }
  }
  if (typeof numero !== 'number' || !Number.isFinite(numero) || numero <= 0) {
    throw new Error('Informe um preço positivo com no máximo duas casas decimais.')
  }
  const centavos = Math.round(numero * 100)
  if (!Number.isSafeInteger(centavos) || centavos <= 0 || Math.abs(numero - centavos / 100) > 1e-9) {
    throw new Error('Informe um preço positivo com no máximo duas casas decimais.')
  }
  return centavos / 100
}

function normalizarEstoque(valor) {
  let numero = valor
  if (typeof valor === 'string') {
    const correspondencia = /^(\d+)(?:\s+unidades?)?$/i.exec(valor.trim())
    if (!correspondencia) throw new Error('Informe um estoque inteiro maior ou igual a zero.')
    numero = Number(correspondencia[1])
  }
  if (!Number.isSafeInteger(numero) || numero < 0) {
    throw new Error('Informe um estoque inteiro maior ou igual a zero.')
  }
  return numero
}

function imagemLocalExistente(imagem) {
  // URLs dos imports no Vite em desenvolvimento, build absoluto ou build relativo.
  const caminho = imagem.split(/[?#]/, 1)[0]
  const correspondencia = /^(?:\/src\/assets\/imagens\/|\/(?:[A-Za-z0-9_-]+\/)*assets\/|\.\/assets\/|assets\/)([A-Za-z0-9_.-]+)$/.exec(caminho)
  if (!correspondencia) return false
  return nomesImagensExistentes.some(nome => {
    const arquivo = correspondencia[1]
    return arquivo === nome + '.png'
      || (arquivo.startsWith(nome + '-') && /^[A-Za-z0-9_-]+\.png$/.test(arquivo.slice(nome.length + 1)))
  })
}

function imagemBlobValida(imagem) {
  if (!imagem.startsWith('blob:')) return false
  const destino = imagem.slice(5)
  if (/^null\/[A-Za-z0-9_-]+$/.test(destino)) return true
  try {
    const url = new URL(destino)
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && !url.username && !url.password && !url.search && !url.hash
      && /^\/[A-Za-z0-9_-]+$/.test(url.pathname)
  } catch {
    return false
  }
}

function imagemDataValida(imagem) {
  const correspondencia = /^data:image\/(?:png|jpeg|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(imagem)
  if (!correspondencia) return false
  return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(correspondencia[1])
}

function imagemStorageValida(imagem, urlSupabase) {
  if (!urlSupabase) return false
  try {
    const foto = new URL(imagem)
    const projeto = new URL(urlSupabase)
    const prefixo = '/storage/v1/object/public/pecas/'
    return foto.protocol === 'https:' && foto.origin === projeto.origin
      && !foto.username && !foto.password && !foto.search && !foto.hash
      && foto.pathname.startsWith(prefixo) && foto.pathname.length > prefixo.length
      && !/%(?:2f|5c|00)/i.test(foto.pathname)
  } catch {
    return false
  }
}

function normalizarImagem(valor, urlSupabase) {
  const imagem = exigirTexto(valor, 'a foto da peça')
  if (!imagemLocalExistente(imagem) && !imagemBlobValida(imagem) && !imagemDataValida(imagem) && !imagemStorageValida(imagem, urlSupabase)) {
    throw new Error('Use uma foto do catálogo ou selecione uma imagem PNG, JPEG, WebP, AVIF ou GIF.')
  }
  return imagem
}

export function normalizarPeca(dados, { urlSupabase } = {}) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error('Os dados da peça são inválidos.')
  }
  const nome = exigirTexto(dados.nome, 'o nome da peça')
  const descricao = exigirTexto(dados.descricao, 'a descrição da peça')
  const preco = normalizarPreco(dados.preco)
  const categoria = exigirTexto(dados.categoria, 'a categoria da peça')
  if (!CATEGORIAS_CATALOGO.includes(categoria)) throw new Error('Selecione uma categoria válida.')
  const prazo = exigirTexto(dados.prazo, 'o prazo de entrega')
  const estoque = normalizarEstoque(dados.estoque)
  const imagem = normalizarImagem(dados.imagem, urlSupabase)
  if (typeof dados.visivel !== 'boolean') throw new Error('Informe se a peça está visível no catálogo.')
  if (dados.tipoDisponibilidade !== undefined && !['sob_encomenda', 'pronta_entrega'].includes(dados.tipoDisponibilidade)) throw new Error('Selecione uma disponibilidade válida.')
  return { nome, descricao, preco, categoria, prazo, estoque, imagem, visivel: dados.visivel, ...(dados.tipoDisponibilidade ? { tipoDisponibilidade: dados.tipoDisponibilidade } : {}) }
}

export function filtrarPorCategorias(lista, categorias = []) {
  exigirLista(lista)
  if (!Array.isArray(categorias) || categorias.some(categoria => !CATEGORIAS_CATALOGO.includes(categoria))) {
    throw new Error('Selecione categorias válidas para filtrar o catálogo.')
  }
  const selecionadas = new Set(categorias)
  return lista.filter(peca => selecionadas.size === 0 || selecionadas.has(peca.categoria))
}

export function adicionarPeca(lista, dados, id) {
  exigirLista(lista)
  const chave = chaveId(id)
  if (lista.some(peca => chaveId(peca?.id) === chave)) {
    throw new Error('Já existe uma peça com esse identificador.')
  }
  const normalizada = normalizarPeca(dados)
  return [...lista, { id: typeof id === 'string' ? id.trim() : id, ...normalizada }]
}

export function editarPeca(lista, id, dados) {
  const indice = encontrarIndice(lista, id)
  const normalizada = normalizarPeca(dados)
  return lista.map((peca, posicao) => posicao === indice ? { ...peca, ...normalizada, id: peca.id } : peca)
}

export function alternarVisibilidade(lista, id) {
  const indice = encontrarIndice(lista, id)
  if (typeof lista[indice].visivel !== 'boolean') {
    throw new Error('A visibilidade da peça é inválida.')
  }
  return lista.map((peca, posicao) => posicao === indice ? { ...peca, visivel: !peca.visivel } : peca)
}

export function excluirPeca(lista, id) {
  const indice = encontrarIndice(lista, id)
  return lista.filter((_, posicao) => posicao !== indice)
}
