import { normalizarPeca } from '../paginas/Admin/CatalogoAdmin/catalogoModelo.js'

const COLUNAS_PECAS = 'atualizado_em,id,categoria_id,nome,descricao,preco_centavos,imagem_capa_url,tipo_disponibilidade,estoque_atual,prazo_producao_dias,visivel,arquivada,categoria:categorias(id,nome,ativa)'
const MAXIMO_INTEIRO_POSTGRES = 2147483647
const MAXIMO_FOTO = 5 * 1024 * 1024
const EXTENSAO_POR_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

function uuidValido(valor, campo = 'o identificador da peça') {
  if (typeof valor !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor.trim())) {
    throw new Error('Informe um UUID válido para ' + campo + '.')
  }
  return valor.trim().toLowerCase()
}

function formatarPrazo(dias) {
  return dias === 1 ? '1 dia útil' : dias + ' dias úteis'
}

function prazoEmDias(valor) {
  let dias = valor
  if (typeof valor === 'string') {
    const texto = valor.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const resultado = /^(\d+)(?:\s+(dia util|dias uteis))?$/.exec(texto)
    if (!resultado) throw new Error('Informe um prazo inteiro positivo, como 7 dias úteis.')
    dias = Number(resultado[1])
    if (resultado[2] && ((dias === 1 && resultado[2] !== 'dia util') || (dias !== 1 && resultado[2] !== 'dias uteis'))) {
      throw new Error('Confira o prazo: use 1 dia útil ou um número maior de dias úteis.')
    }
  }
  if (!Number.isSafeInteger(dias) || dias <= 0 || dias > MAXIMO_INTEIRO_POSTGRES) {
    throw new Error('Informe um prazo inteiro positivo, como 7 dias úteis.')
  }
  return dias
}

function validarFoto(arquivo) {
  if (typeof Blob === 'undefined' || !(arquivo instanceof Blob)) {
    throw new Error('Selecione um arquivo de foto válido antes de salvar.')
  }
  if (!Object.hasOwn(EXTENSAO_POR_MIME, arquivo.type)) {
    throw new Error('Selecione uma foto JPEG, PNG, WebP ou AVIF.')
  }
  if (arquivo.size <= 0 || arquivo.size > MAXIMO_FOTO) {
    throw new Error('A foto deve ter conteúdo e no máximo 5 MB.')
  }
  return EXTENSAO_POR_MIME[arquivo.type]
}

function sqlStateConfirmado(erro) {
  if (erro?.conflitoCatalogo) return true
  const codigo = erro?.code
  // Falhas de conexão, cancelamento/timeout e conclusão desconhecida não
  // comprovam rollback: uma foto já referenciada não pode ser apagada.
  return typeof codigo === 'string' && /^[0-9A-Z]{5}$/.test(codigo)
    && !/^(08|57|58|F0|HV|XX)/.test(codigo) && codigo !== '40003'
}

function mensagemServidor(erro, acao) {
  if (erro?.conflitoCatalogo) return 'A peça foi alterada em outra sessão ou não está mais disponível. Recarregue o catálogo antes de tentar novamente.'
  if (erro?.code === '42501' || erro?.status === 401 || erro?.status === 403) {
    return 'Você não tem permissão para esta operação do catálogo. Entre com uma conta administradora.'
  }
  if (erro?.code === '23503') return 'A categoria não está mais disponível. Atualize o catálogo e tente novamente.'
  if (erro?.code === '23505') return 'Este identificador já foi utilizado. Atualize o catálogo para conferir a peça antes de tentar novamente.'
  if (erro?.code === '23514' || /^22/.test(erro?.code || '')) {
    return 'Os dados da peça não foram aceitos. Confira nome, preço, prazo, estoque e categoria.'
  }
  if (erro?.code === '42P01' || erro?.code === 'PGRST205') {
    return 'O catálogo ainda não está disponível no servidor. Confira a configuração do serviço.'
  }
  return 'Não foi possível ' + acao + '. Tente novamente.'
}

function erroDeEscrita(erro, acao, idNovaPeca) {
  const confirmado = sqlStateConfirmado(erro)
  const resposta = new Error(confirmado
    ? mensagemServidor(erro, acao)
    : 'Não foi possível confirmar a gravação. Atualize o catálogo para conferir o resultado antes de tentar novamente.')
  resposta.codigo = typeof erro?.code === 'string' ? erro.code : ''
  resposta.resultadoIncerto = !confirmado
  if (idNovaPeca) resposta.idNovaPeca = idNovaPeca
  return resposta
}

function confirmarRegistro(data, id) {
  if (!data || Array.isArray(data) || typeof data !== 'object' || String(data.id).toLowerCase() !== id) {
    throw new Error('O servidor não confirmou a peça alterada.')
  }
  return data
}

function mapearPeca(registro) {
  const categoria = Array.isArray(registro.categoria) ? registro.categoria[0] : registro.categoria
  const precoCentavos = Number(registro.preco_centavos)
  const prazoDias = Number(registro.prazo_producao_dias)
  const estoque = registro.estoque_atual == null ? 0 : Number(registro.estoque_atual)
  if (!Number.isInteger(precoCentavos) || precoCentavos <= 0 || precoCentavos > MAXIMO_INTEIRO_POSTGRES
    || !Number.isInteger(prazoDias) || prazoDias <= 0
    || !Number.isInteger(estoque) || estoque < 0) {
    throw new Error('O servidor retornou uma peça com valores inválidos. Atualize o catálogo.')
  }
  return {
    id: registro.id,
    atualizadoEm: registro.atualizado_em,
    nome: registro.nome,
    descricao: registro.descricao ?? '',
    preco: precoCentavos / 100,
    categoria: categoria?.nome || '',
    categoriaId: registro.categoria_id || categoria?.id || null,
    prazo: formatarPrazo(prazoDias),
    prazoDias,
    estoque,
    tipoDisponibilidade: registro.tipo_disponibilidade,
    imagem: registro.imagem_capa_url,
    visivel: registro.visivel === true,
  }
}

export function criarServicoPecas({ cliente, urlSupabase, gerarId } = {}) {
  let base = null
  try {
    const url = new URL(urlSupabase)
    if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/') base = url.origin
  } catch {
    // A falta de configuração é informada ao chamar o serviço, sem derrubar a página.
  }
  const novoId = () => uuidValido(gerarId ? gerarId() : globalThis.crypto?.randomUUID())

  function exigirConexao() {
    if (!base || !cliente || typeof cliente.from !== 'function') {
      throw new Error('O serviço de catálogo não está configurado. Tente novamente mais tarde.')
    }
  }

  function validarUrlStorage(valor) {
    let imagem
    try { imagem = new URL(valor) } catch { throw new Error('A foto precisa estar no Storage do catálogo.') }
    if (imagem.protocol !== 'https:' || imagem.origin !== base || imagem.username || imagem.password
      || !imagem.pathname.startsWith('/storage/v1/object/public/pecas/')
      || imagem.pathname === '/storage/v1/object/public/pecas/') {
      throw new Error('A foto precisa estar no Storage do catálogo.')
    }
    return imagem.href
  }

  async function lerTodos(criarConsulta) {
    const registros = []
    let cursor
    while (true) {
      let consulta = criarConsulta().order('id', { ascending: true }).limit(200)
      if (cursor) consulta = consulta.gt('id', cursor)
      const resposta = await consulta
      if (resposta.error) throw resposta.error
      if (!Array.isArray(resposta.data)) throw new Error('O servidor não retornou uma lista válida.')
      if (!resposta.data.length) return registros
      const proximo = resposta.data.at(-1).id
      if (!proximo || (cursor && proximo <= cursor)) throw new Error('Não foi possível continuar o carregamento do catálogo.')
      registros.push(...resposta.data)
      cursor = proximo
    }
  }

  async function listarCategorias() {
    exigirConexao()
    try {
      const categorias = await lerTodos(() => cliente.from('categorias').select('id,nome,ativa,ordem'))
      return categorias.map(categoria => ({ id: categoria.id, nome: categoria.nome, ativa: categoria.ativa === true, ordem: categoria.ordem ?? 0 }))
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'))
    } catch (erro) { throw new Error(mensagemServidor(erro, 'carregar as categorias'), { cause: erro }) }
  }

  async function listarPecas({ somenteVisiveis = false } = {}) {
    exigirConexao()
    try {
      const registros = await lerTodos(() => {
        let consulta = cliente.from('pecas').select(COLUNAS_PECAS).eq('arquivada', false)
        if (somenteVisiveis) consulta = consulta.eq('visivel', true)
        return consulta
      })
      return registros.filter(peca => peca.arquivada !== true && (!somenteVisiveis || peca.visivel === true)).map(mapearPeca)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.id.localeCompare(b.id))
    } catch (erro) { throw new Error(mensagemServidor(erro, 'carregar as peças'), { cause: erro }) }
  }

  function exigirVersao(valor) {
    if (typeof valor !== 'string' || !valor) throw new Error('Recarregue o catálogo antes de alterar a peça.')
    return valor
  }

  function conferirErroAtualizacao(error) {
    if (error?.code === 'PGRST116') throw { ...error, conflitoCatalogo: true }
    if (error) throw error
  }

  async function salvarPeca(dados, { id = null, idNovaPeca } = {}) {
    exigirConexao()
    const identificador = id == null ? uuidValido(idNovaPeca ?? novoId()) : uuidValido(id)
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error('Os dados da peça são inválidos.')
    const dias = prazoEmDias(dados.prazo ?? dados.prazoDias)
    const tipo = dados.tipoDisponibilidade ?? (id == null ? 'sob_encomenda' : null)
    if (!['sob_encomenda', 'pronta_entrega'].includes(tipo)) {
      throw new Error('Informe se a peça é sob encomenda ou para pronta entrega.')
    }
    const categoriaId = uuidValido(dados.categoriaId, 'a categoria')
    if (id != null) exigirVersao(dados.atualizadoEm)
    const temArquivo = dados.fotoArquivo != null
    let bucket = null
    let caminhoNovo = null
    let imagem = dados.imagem
    if (temArquivo) {
      const extensao = validarFoto(dados.fotoArquivo)
      caminhoNovo = identificador + '/' + novoId() + '.' + extensao
      if (!cliente.storage || typeof cliente.storage.from !== 'function') throw new Error('O envio de fotos ainda não está configurado.')
      bucket = cliente.storage.from('pecas')
      const publica = bucket.getPublicUrl(caminhoNovo)
      imagem = validarUrlStorage(publica?.data?.publicUrl)
      if (new URL(imagem).pathname !== '/storage/v1/object/public/pecas/' + caminhoNovo) throw new Error('Não foi possível preparar o endereço da foto.')
    } else {
      imagem = validarUrlStorage(imagem)
    }
    const categorias = await listarCategorias()
    const normalizada = normalizarPeca({ ...dados, prazo: formatarPrazo(dias), imagem }, { urlSupabase: base, categoriasPermitidas: categorias.map(item => item.nome) })
    if (Array.from(normalizada.nome).length < 2) throw new Error('O nome da peça deve ter pelo menos dois caracteres.')
    const precoCentavos = Math.round(normalizada.preco * 100)
    if (!Number.isSafeInteger(precoCentavos) || precoCentavos <= 0 || precoCentavos > MAXIMO_INTEIRO_POSTGRES) {
      throw new Error('O preço ultrapassa o limite permitido pelo catálogo.')
    }
    if (normalizada.estoque > MAXIMO_INTEIRO_POSTGRES) throw new Error('O estoque ultrapassa o limite permitido pelo catálogo.')
    const categoria = categorias.find(item => String(item.id).toLowerCase() === categoriaId)
    if (!categoria || categoria.nome !== normalizada.categoria) {
      throw new Error('A categoria selecionada não está disponível ou não corresponde à peça.')
    }
    const valores = {
      categoria_id: categoriaId,
      nome: normalizada.nome,
      descricao: normalizada.descricao,
      preco_centavos: precoCentavos,
      imagem_capa_url: imagem,
      tipo_disponibilidade: tipo,
      estoque_atual: normalizada.estoque,
      prazo_producao_dias: dias,
      visivel: normalizada.visivel,
    }
    let uploadConcluido = false
    if (temArquivo) {
      let envio
      try { envio = await bucket.upload(caminhoNovo, dados.fotoArquivo, { contentType: dados.fotoArquivo.type, upsert: false }) } catch {
        throw new Error('Não foi possível confirmar o envio da foto. Verifique sua conexão e tente novamente.')
      }
      if (envio?.error) throw new Error(mensagemServidor(envio.error, 'enviar a foto'))
      if (!envio?.data || envio.data.path !== caminhoNovo) throw new Error('Não foi possível confirmar o envio da foto. Nenhuma gravação da peça foi iniciada.')
      uploadConcluido = true
    }
    try {
      let consulta
      if (id == null) consulta = cliente.from('pecas').insert({ id: identificador, ...valores, arquivada: false })
      else consulta = cliente.from('pecas').update(valores).eq('id', identificador).eq('arquivada', false).eq('atualizado_em', dados.atualizadoEm)
      const { data, error } = await consulta.select(COLUNAS_PECAS).single()
      if (id != null) conferirErroAtualizacao(error)
      else if (error) throw error
      return mapearPeca(confirmarRegistro(data, identificador))
    } catch (erro) {
      const resposta = erroDeEscrita(erro, 'salvar a peça', id == null ? identificador : null)
      if (uploadConcluido && sqlStateConfirmado(erro)) {
        try {
          const limpeza = await bucket.remove([caminhoNovo])
          if (limpeza?.error) resposta.fotoPendente = true
        } catch {
          resposta.fotoPendente = true
        }
      }
      if (resposta.fotoPendente) resposta.message += ' Não foi possível remover a foto recém-enviada do armazenamento; será necessário conferir esse arquivo.'
      throw resposta
    }
  }

  async function alterarVisibilidade(id, visivel, atualizadoEm) {
    exigirVersao(atualizadoEm)
    exigirConexao()
    const identificador = uuidValido(id)
    if (typeof visivel !== 'boolean') throw new Error('Informe a visibilidade desejada para a peça.')
    try {
      const { data, error } = await cliente.from('pecas').update({ visivel }).eq('id', identificador).eq('arquivada', false).eq('atualizado_em', atualizadoEm).select(COLUNAS_PECAS).single()
      conferirErroAtualizacao(error)
      const registro = confirmarRegistro(data, identificador)
      if (registro.visivel !== visivel) throw new Error('O servidor não confirmou a visibilidade desejada.')
      return mapearPeca(registro)
    } catch (erro) {
      throw erroDeEscrita(erro, 'alterar a visibilidade da peça')
    }
  }

  async function excluirPeca(id, atualizadoEm) {
    exigirVersao(atualizadoEm)
    exigirConexao()
    const identificador = uuidValido(id)
    try {
      const { data, error } = await cliente.from('pecas').update({ arquivada: true, visivel: false }).eq('id', identificador).eq('atualizado_em', atualizadoEm).select(COLUNAS_PECAS).single()
      conferirErroAtualizacao(error)
      const registro = confirmarRegistro(data, identificador)
      if (registro.arquivada !== true || registro.visivel !== false) throw new Error('O servidor não confirmou o arquivamento da peça.')
      return mapearPeca(registro)
    } catch (erro) {
      throw erroDeEscrita(erro, 'excluir a peça do catálogo')
    }
  }

  return { listarCategorias, listarPecas, salvarPeca, alterarVisibilidade, excluirPeca }
}
