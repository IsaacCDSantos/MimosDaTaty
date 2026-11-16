const TAMANHO_LOTE = 200
const MAXIMO_INTEIRO_POSTGRES = 2147483647

function uuidValido(valor, campo) {
  if (typeof valor !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor.trim())) {
    throw new Error('Informe um UUID válido para ' + campo + '.')
  }
  return valor.trim().toLowerCase()
}

function inteiroPositivo(valor, campo, maximo = Number.MAX_SAFE_INTEGER) {
  if (typeof valor !== 'number' && !(typeof valor === 'string' && /^\d+$/.test(valor))) {
    throw new Error('O servidor retornou ' + campo + ' inválido.')
  }
  const numero = Number(valor)
  if (!Number.isSafeInteger(numero) || numero <= 0 || numero > maximo) {
    throw new Error('O servidor retornou ' + campo + ' inválido.')
  }
  return numero
}

function mapearDestaque(registro) {
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)
    || typeof registro.nome !== 'string' || !registro.nome.trim()) {
    throw new Error('O servidor retornou uma peça inválida nos destaques.')
  }
  const dias = inteiroPositivo(registro.prazo_producao_dias, 'prazo de produção', MAXIMO_INTEIRO_POSTGRES)
  return {
    id: uuidValido(registro.id, 'a peça retornada nos destaques'),
    nome: registro.nome,
    descricao: typeof registro.descricao === 'string' ? registro.descricao : '',
    preco: inteiroPositivo(registro.preco_centavos, 'preço', MAXIMO_INTEIRO_POSTGRES) / 100,
    imagem: registro.imagem_capa_url || '',
    categoria: typeof registro.categoria === 'string' ? registro.categoria : '',
    prazo: dias === 1 ? '1 dia útil' : dias + ' dias úteis',
    prazoDias: dias,
    visivel: true,
    visualizacoes: inteiroPositivo(registro.visualizacoes, 'número de visualizações'),
  }
}

function mensagemErro(erro, acao) {
  if (erro?.code === '42501' || erro?.status === 401 || erro?.status === 403) {
    return 'Você não tem permissão para esta operação das visualizações. Entre com uma conta administradora para consultar os destaques.'
  }
  if (['PGRST202', '42883', '42P01', 'PGRST205'].includes(erro?.code)) {
    return 'As visualizações do catálogo ainda não estão disponíveis no servidor. Tente novamente mais tarde.'
  }
  return 'Não foi possível ' + acao + '. Tente novamente.'
}

export function criarServicoVisualizacoes({ cliente } = {}) {
  async function consultar(nome, parametros, acao) {
    if (!cliente || typeof cliente.rpc !== 'function') {
      throw new Error('O serviço de visualizações do catálogo não está configurado.')
    }
    try {
      const resposta = await cliente.rpc(nome, parametros)
      if (resposta?.error) throw resposta.error
      return resposta?.data
    } catch (erro) {
      throw new Error(mensagemErro(erro, acao), { cause: erro })
    }
  }

  async function registrarVisualizacao(pecaId, aberturaId) {
    const peca = uuidValido(pecaId, 'a peça')
    const abertura = uuidValido(aberturaId, 'a abertura dos detalhes')
    const resposta = await consultar('registrar_visualizacao_peca', {
      p_peca_id: peca,
      p_abertura_id: abertura,
    }, 'registrar a visualização da peça')
    if (typeof resposta !== 'boolean') throw new Error('O servidor não confirmou o registro da visualização.')
    return resposta
  }

  async function listarDestaques({ limite } = {}) {
    if (limite !== undefined && (!Number.isSafeInteger(limite) || limite < 0 || limite > MAXIMO_INTEIRO_POSTGRES)) {
      throw new Error('Informe uma quantidade inteira maior ou igual a zero para os destaques.')
    }
    const destaques = []
    const ids = new Set()
    let offset = 0
    while (limite === undefined || destaques.length < limite) {
      const quantidade = limite === undefined ? TAMANHO_LOTE : Math.min(TAMANHO_LOTE, limite - destaques.length)
      const registros = await consultar('listar_destaques_catalogo', { p_limite: quantidade, p_offset: offset }, 'carregar os destaques do catálogo')
      if (!Array.isArray(registros) || registros.length > quantidade) {
        throw new Error('O servidor não retornou uma lista válida de destaques.')
      }
      for (const registro of registros) {
        const peca = mapearDestaque(registro)
        if (ids.has(peca.id)) throw new Error('Os destaques mudaram durante a consulta. Atualize a lista para conferir a ordem atual.')
        ids.add(peca.id)
        destaques.push(peca)
      }
      if (registros.length < quantidade) break
      offset += registros.length
    }
    return destaques
  }

  return { registrarVisualizacao, listarDestaques }
}
