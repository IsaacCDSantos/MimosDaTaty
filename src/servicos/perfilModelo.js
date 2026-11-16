const COLUNAS_PERFIL = 'id,nome_completo,telefone'
const COLUNAS_ENDERECO = 'id,cliente_id,destinatario,cep,logradouro,numero,complemento,bairro,cidade,uf,principal'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const UFS = new Set(['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'])

function falha(mensagem, codigo, resultadoIncerto = false) {
  const erro = new Error(mensagem)
  erro.codigo = codigo
  erro.resultadoIncerto = resultadoIncerto
  return erro
}

function objetoValido(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw falha('Os dados informados são inválidos.', 'DADOS_INVALIDOS')
  }
}

function textoObrigatorio(valor, campo, minimo, maximo) {
  if (typeof valor !== 'string') throw falha('Preencha ' + campo + '.', 'DADOS_INVALIDOS')
  const texto = valor.trim()
  const tamanho = Array.from(texto).length
  if (tamanho < minimo || tamanho > maximo) {
    throw falha('O campo ' + campo + ' deve ter entre ' + minimo + ' e ' + maximo + ' caracteres.', 'DADOS_INVALIDOS')
  }
  return texto
}

function textoOpcional(valor, campo, maximo) {
  if (valor === undefined || valor === null || valor === '') return null
  if (typeof valor !== 'string') throw falha('Confira ' + campo + '.', 'DADOS_INVALIDOS')
  const texto = valor.trim()
  if (!texto) return null
  if (Array.from(texto).length > maximo) throw falha('O campo ' + campo + ' deve ter no máximo ' + maximo + ' caracteres.', 'DADOS_INVALIDOS')
  return texto
}

function telefoneNormalizado(valor) {
  if (valor === null || valor === undefined || (typeof valor === 'string' && !valor.trim())) return null
  if (typeof valor !== 'string' || !/^[0-9\s()+.-]+$/.test(valor)) {
    throw falha('Informe um telefone com DDD e 10 ou 11 números.', 'TELEFONE_INVALIDO')
  }
  const telefone = valor.replace(/\D/g, '')
  if (!/^\d{10,11}$/.test(telefone)) throw falha('Informe um telefone com DDD e 10 ou 11 números.', 'TELEFONE_INVALIDO')
  return telefone
}

export function normalizarDadosPessoais(dados) {
  objetoValido(dados)
  return {
    nome_completo: textoObrigatorio(dados.nomeCompleto, 'nome completo', 2, 120),
    telefone: telefoneNormalizado(dados.telefone),
  }
}

export function normalizarEndereco(dados) {
  objetoValido(dados)
  if (typeof dados.cep !== 'string' || !/^\d{5}-?\d{3}$/.test(dados.cep.trim())) {
    throw falha('Informe um CEP com oito números, com ou sem hífen.', 'CEP_INVALIDO')
  }
  const uf = typeof dados.uf === 'string' ? dados.uf.trim().toUpperCase() : ''
  if (!UFS.has(uf)) throw falha('Selecione uma UF válida.', 'UF_INVALIDA')
  return {
    destinatario: textoObrigatorio(dados.destinatario, 'destinatário', 2, 120),
    cep: dados.cep.trim().replace('-', ''),
    logradouro: textoObrigatorio(dados.logradouro, 'logradouro', 2, 150),
    numero: textoObrigatorio(dados.numero, 'número', 1, 20),
    complemento: textoOpcional(dados.complemento, 'complemento', 150),
    bairro: textoObrigatorio(dados.bairro, 'bairro', 2, 100),
    cidade: textoObrigatorio(dados.cidade, 'cidade', 2, 100),
    uf,
  }
}

function idValido(valor) {
  return typeof valor === 'string' && UUID.test(valor.trim()) ? valor.trim().toLowerCase() : null
}

function esperadoNormalizado(usuarioEsperado) {
  return idValido(typeof usuarioEsperado === 'string' ? usuarioEsperado : usuarioEsperado?.id)
}

function telefoneAmigavel(valor) {
  const digitos = typeof valor === 'string' ? valor.replace(/\D/g, '') : ''
  if (digitos.length === 11) return '(' + digitos.slice(0, 2) + ') ' + digitos.slice(2, 7) + '-' + digitos.slice(7)
  if (digitos.length === 10) return '(' + digitos.slice(0, 2) + ') ' + digitos.slice(2, 6) + '-' + digitos.slice(6)
  return ''
}

function textoExibicao(valor) { return typeof valor === 'string' ? valor.trim() : '' }

function enderecoAmigavel(endereco) {
  const cep = textoExibicao(endereco.cep)
  return {
    id: endereco.id,
    destinatario: textoExibicao(endereco.destinatario),
    cep: /^\d{8}$/.test(cep) ? cep.slice(0, 5) + '-' + cep.slice(5) : cep,
    logradouro: textoExibicao(endereco.logradouro),
    numero: textoExibicao(endereco.numero),
    complemento: textoExibicao(endereco.complemento),
    bairro: textoExibicao(endereco.bairro),
    cidade: textoExibicao(endereco.cidade),
    uf: textoExibicao(endereco.uf),
    principal: endereco.principal === true,
  }
}

function sqlStateConfirmado(erro) {
  return typeof erro?.code === 'string' && /^[0-9A-Z]{5}$/.test(erro.code)
    && !/^(08|57|58|F0|HV|XX)/.test(erro.code) && erro.code !== '40003'
}

function erroConsulta(erro) {
  if (erro?.code === '42501') return falha('Não foi possível acessar seus dados. Entre novamente na sua conta.', 'ACESSO_NEGADO')
  return falha('Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.', 'CONSULTA_INDISPONIVEL')
}

function erroEscrita(erro, endereco = false) {
  const confirmado = sqlStateConfirmado(erro)
  let mensagem
  if (!confirmado) mensagem = 'Não foi possível confirmar o salvamento. Recarregue seus dados para conferir o resultado antes de tentar novamente.'
  else if (erro.code === '23505' && endereco) mensagem = 'Já existe um endereço principal. Recarregue seus dados antes de tentar novamente.'
  else if (erro.code === '42501') mensagem = 'Não foi possível salvar seus dados com esta sessão. Entre novamente na sua conta.'
  else if (erro.code === '23503') mensagem = 'Seu perfil não está disponível. Recarregue a página antes de tentar novamente.'
  else mensagem = 'Os dados não foram aceitos. Confira os campos e tente novamente.'
  return falha(mensagem, typeof erro?.code === 'string' ? erro.code : 'SALVAMENTO_NAO_CONFIRMADO', !confirmado)
}

function confirmarPerfil(registro, usuarioId) {
  if (!registro || Array.isArray(registro) || idValido(registro.id) !== usuarioId) {
    throw new Error('O servidor não confirmou o perfil desta conta.')
  }
  return registro
}

function confirmarEndereco(registro, usuarioId, enderecoId = null) {
  if (!registro || Array.isArray(registro) || !idValido(registro.id)
    || idValido(registro.cliente_id) !== usuarioId || (enderecoId && idValido(registro.id) !== enderecoId)) {
    throw new Error('O servidor não confirmou o endereço desta conta.')
  }
  return registro
}

export function criarServicoPerfil(cliente) {
  async function obterUsuario(usuarioEsperado, obrigatorio = false) {
    const esperado = esperadoNormalizado(usuarioEsperado)
    if ((obrigatorio || usuarioEsperado != null) && !esperado) {
      throw falha('Sua sessão mudou. Recarregue a página e entre novamente antes de continuar.', 'SESSAO_ALTERADA')
    }
    if (!cliente?.auth || typeof cliente.auth.getUser !== 'function' || typeof cliente.from !== 'function') {
      throw falha('O serviço de perfil está indisponível no momento.', 'SERVICO_INDISPONIVEL')
    }
    let resposta
    try { resposta = await cliente.auth.getUser() } catch {
      throw falha('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.', 'SESSAO_INDISPONIVEL')
    }
    const erro = resposta?.error
    if (erro && (erro.name === 'AuthRetryableFetchError' || erro.status === 0 || erro.status >= 500 || erro.code === 'request_timeout')) {
      throw falha('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.', 'SESSAO_INDISPONIVEL')
    }
    const usuario = resposta?.data?.user
    const id = idValido(usuario?.id)
    if (erro || !id || (esperado && id !== esperado)) {
      throw falha(esperado ? 'Sua sessão mudou. Recarregue a página e entre novamente antes de continuar.' : 'Entre na sua conta para acessar o perfil.', esperado ? 'SESSAO_ALTERADA' : 'LOGIN_NECESSARIO')
    }
    return { ...usuario, id }
  }

  async function carregarPerfil(usuarioEsperado) {
    const usuario = await obterUsuario(usuarioEsperado)
    let perfil
    let endereco
    try {
      const [respostaPerfil, respostaEndereco] = await Promise.all([
        cliente.from('perfis').select(COLUNAS_PERFIL).eq('id', usuario.id).maybeSingle(),
        cliente.from('enderecos_cliente').select(COLUNAS_ENDERECO).eq('cliente_id', usuario.id)
          .order('principal', { ascending: false }).order('criado_em', { ascending: true }).limit(1).maybeSingle(),
      ])
      if (respostaPerfil.error) throw respostaPerfil.error
      if (respostaEndereco.error) throw respostaEndereco.error
      if (!respostaPerfil.data) throw falha('Seu perfil não foi encontrado. Recarregue a página ou entre novamente.', 'PERFIL_NAO_ENCONTRADO')
      perfil = confirmarPerfil(respostaPerfil.data, usuario.id)
      endereco = respostaEndereco.data ? confirmarEndereco(respostaEndereco.data, usuario.id) : null
    } catch (erro) {
      if (erro.codigo === 'PERFIL_NAO_ENCONTRADO') throw erro
      throw erroConsulta(erro)
    }
    const metadata = usuario.user_metadata || {}
    const nomeFallback = textoExibicao(metadata.nome) || textoExibicao(metadata.full_name)
    return {
      id: usuario.id,
      nomeCompleto: perfil.nome_completo == null ? nomeFallback : textoExibicao(perfil.nome_completo),
      telefone: telefoneAmigavel(perfil.telefone),
      email: textoExibicao(usuario.email),
      endereco: endereco ? enderecoAmigavel(endereco) : null,
    }
  }

  async function salvarDadosPessoais(dados, usuarioEsperado) {
    const valores = normalizarDadosPessoais(dados)
    const usuario = await obterUsuario(usuarioEsperado, true)
    try {
      const { data, error } = await cliente.from('perfis').update(valores).eq('id', usuario.id).select(COLUNAS_PERFIL).single()
      if (error) throw error
      const salvo = confirmarPerfil(data, usuario.id)
      return { id: salvo.id, nomeCompleto: textoExibicao(salvo.nome_completo), telefone: telefoneAmigavel(salvo.telefone) }
    } catch (erro) {
      throw erroEscrita(erro)
    }
  }

  async function salvarEndereco(dados, usuarioEsperado, idEndereco = null) {
    const valores = normalizarEndereco(dados)
    const enderecoId = idEndereco == null ? null : idValido(idEndereco)
    if (idEndereco != null && !enderecoId) throw falha('O endereço selecionado é inválido. Recarregue seus dados.', 'ENDERECO_INVALIDO')
    const usuario = await obterUsuario(usuarioEsperado, true)
    try {
      let consulta
      if (enderecoId) consulta = cliente.from('enderecos_cliente').update(valores).eq('id', enderecoId).eq('cliente_id', usuario.id)
      else consulta = cliente.from('enderecos_cliente').insert({ ...valores, cliente_id: usuario.id, principal: true })
      const { data, error } = await consulta.select(COLUNAS_ENDERECO).single()
      if (error) throw error
      return enderecoAmigavel(confirmarEndereco(data, usuario.id, enderecoId))
    } catch (erro) {
      throw erroEscrita(erro, true)
    }
  }

  return { carregarPerfil, salvarDadosPessoais, salvarEndereco }
}
