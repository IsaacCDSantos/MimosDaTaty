const LIMITE_INTEIRO = 2147483647
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const TIPOS_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024

function inteiro(texto, padrao, minimo, mensagem) {
  const resultado = String(texto).trim().match(padrao)
  const valor = resultado ? Number(resultado[1]) : NaN
  if (!Number.isSafeInteger(valor) || valor < minimo || valor > LIMITE_INTEIRO) throw new Error(mensagem)
  return valor
}

export function validarDadosPeca(peca, categorias = []) {
  if (peca.nome.trim().length < 2) throw new Error('Informe um nome com pelo menos dois caracteres.')
  const preco = peca.preco.trim().match(/^(\d+)(?:[,.](\d{1,2}))?$/)
  const centavos = preco ? Number(preco[1]) * 100 + Number((preco[2] || '').padEnd(2, '0')) : NaN
  if (!Number.isSafeInteger(centavos) || centavos <= 0 || centavos > LIMITE_INTEIRO) {
    throw new Error('Informe um preço válido maior que zero, com até duas casas decimais.')
  }
  const estoque = inteiro(peca.estoque, /^(\d+)(?:\s+unidades?)?$/i, 0, 'Informe um estoque inteiro igual ou maior que zero.')
  const prazo = inteiro(peca.prazo, /^(\d+)(?:\s+dias?(?:\s+(?:útil|úteis|util|uteis))?)?$/i, 1, 'Informe um prazo inteiro maior que zero, em dias.')
  if (!UUID.test(peca.categoria_id) || !categorias.some(cat => cat.id === peca.categoria_id)) {
    throw new Error('Selecione uma categoria válida carregada da loja.')
  }
  return {
    nome: peca.nome.trim(), descricao: peca.descricao.trim() || null,
    preco_centavos: centavos, categoria_id: peca.categoria_id,
    estoque_atual: estoque, prazo_producao_dias: prazo,
    tipo_disponibilidade: estoque > 0 ? 'pronta_entrega' : 'sob_encomenda', visivel: peca.visivel,
  }
}

export function validarFoto(arquivo) {
  if (!arquivo) throw new Error('Adicione uma foto para cadastrar a peça.')
  if (!TIPOS_IMAGEM_PERMITIDOS.includes(arquivo.type)) throw new Error('Formato inválido. Use JPEG, PNG, WebP ou AVIF.')
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) throw new Error('A imagem excede o limite de 5 MB.')
}

export async function carregarCategoriasPecas(cliente) {
  if (!cliente) throw new Error('Serviço do banco de dados não configurado.')
  const { data, error } = await cliente.from('categorias').select('id, nome').eq('ativa', true).order('ordem', { ascending: true })
  if (error) throw new Error('Não foi possível carregar as categorias. Recarregue a página para tentar novamente.')
  return data || []
}

// O ID da imagem é preservado entre tentativas, inclusive quando a resposta de uma gravação se perde.
export async function registrarImagemPeca(cliente, imagem) {
  const existente = await cliente.from('peca_imagens').select('id').eq('id', imagem.id).maybeSingle()
  if (existente.error) throw new Error('Não foi possível verificar o registro da foto. Tente novamente.')
  if (existente.data) return
  const ultima = await cliente.from('peca_imagens').select('ordem').eq('peca_id', imagem.peca_id).order('ordem', { ascending: false }).limit(1).maybeSingle()
  if (ultima.error) throw new Error('Não foi possível consultar as fotos da peça. Tente novamente.')
  const { data, error } = await cliente.from('peca_imagens').insert({ ...imagem, ordem: (ultima.data?.ordem || 0) + 1 }).select('id').single()
  if (error || !data) throw new Error('Não foi possível concluir o registro da foto. Tente novamente.')
}

function rejeicaoConfirmada(resposta) {
  return (resposta.status >= 400 && resposta.status < 500 && resposta.status !== 408) || /^(22|23|40|42|P0001)/.test(resposta.error?.code || '')
}

async function limparUpload(cliente, caminho) {
  if (!caminho) return ''
  try {
    const { error } = await cliente.storage.from('pecas').remove([caminho])
    if (!error) return ''
  } catch { /* Mantém a falha original e informa que a compensação não foi concluída. */ }
  return ' A foto enviada não pôde ser removida do armazenamento; será necessário conferir esse arquivo.'
}

export async function salvarPeca(cliente, { dados, foto, id, versao, imagemAtualUrl }) {
  if (!cliente) throw new Error('Serviço do banco de dados não configurado.')
  if (!id || foto) validarFoto(foto)
  if (id && !versao) throw new Error('Recarregue a peça antes de salvar.')
  const idRegistro = id || crypto.randomUUID()
  let caminho
  let imagemUrl = imagemAtualUrl
  if (foto) {
    const extensao = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }[foto.type]
    caminho = `${crypto.randomUUID()}.${extensao}`
    const upload = await cliente.storage.from('pecas').upload(caminho, foto, { contentType: foto.type, upsert: false })
    if (upload.error) throw new Error(`Não foi possível enviar a foto: ${upload.error.message}`)
    imagemUrl = cliente.storage.from('pecas').getPublicUrl(caminho).data.publicUrl
  }

  let resposta
  try {
    const payload = { ...dados, imagem_capa_url: imagemUrl }
    const consulta = id
      ? cliente.from('pecas').update(payload).eq('id', id).eq('atualizado_em', versao)
      : cliente.from('pecas').insert({ ...payload, id: idRegistro, arquivada: false })
    resposta = await consulta.select('id, imagem_capa_url, atualizado_em').maybeSingle()
  } catch {
    resposta = { error: { message: 'Falha de conexão.' }, status: 0 }
  }

  if (resposta.error || !resposta.data) {
    if ((id && !resposta.error && !resposta.data) || rejeicaoConfirmada(resposta)) {
      const limpeza = await limparUpload(cliente, caminho)
      throw new Error((resposta.error ? `Não foi possível salvar a peça: ${resposta.error.message}` : 'A peça não foi alterada. Ela pode ter sido modificada em outra sessão ou não estar mais acessível. Recarregue os dados.') + limpeza)
    }
    // Uma falha de rede pode ocorrer DEPOIS do commit. Não apagar uma foto possivelmente em uso.
    const erro = new Error('Não foi possível confirmar o salvamento. Confira a peça antes de repetir a operação; a foto foi preservada por segurança.')
    erro.resultadoIncerto = true
    erro.idPeca = idRegistro
    throw erro
  }

  const pendenciaImagem = foto ? { id: crypto.randomUUID(), peca_id: idRegistro, imagem_url: imagemUrl } : null
  if (pendenciaImagem) {
    try { await registrarImagemPeca(cliente, pendenciaImagem) } catch {
      return { peca: resposta.data, pendenciaImagem }
    }
  }
  return { peca: resposta.data, pendenciaImagem: null }
}

export async function arquivarPeca(cliente, id, versao) {
  if (!cliente || !id || !versao) throw new Error('Recarregue a peça antes de excluir.')
  const { data, error } = await cliente.from('pecas').update({ arquivada: true, visivel: false }).eq('id', id).eq('atualizado_em', versao).select('id').maybeSingle()
  if (error) throw new Error(`Não foi possível excluir a peça: ${error.message}`)
  if (!data) throw new Error('A peça não foi excluída. Recarregue os dados: ela pode ter sido alterada em outra sessão ou não estar mais acessível.')
}
