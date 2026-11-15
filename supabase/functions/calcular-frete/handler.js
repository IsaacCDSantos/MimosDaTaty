import { ErroFrete, validarPedido, prepararCotacao, normalizarOpcoes } from './modelo.js'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: cors })
async function lerCorpoLimitado(req) {
 const leitor = req.body?.getReader()
 if (!leitor) return ''
 const decoder = new TextDecoder()
 let tamanho = 0
 let texto = ''
 try {
  while (true) {
   const { value, done } = await leitor.read()
   if (done) return texto + decoder.decode()
   tamanho += value.byteLength
   if (tamanho > 12000) {
    await leitor.cancel()
    throw new ErroFrete(413, 'PEDIDO_GRANDE', 'O carrinho ultrapassa o tamanho permitido.')
   }
   texto += decoder.decode(value, { stream: true })
  }
 } finally { leitor.releaseLock() }
}
export function criarHandlerFrete({ carregarPecas, consultarFrete, config, agora = () => Date.now() }) {
 const limites = new Map()
 return async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ codigo: 'METODO_INVALIDO', mensagem: 'Use o cálculo de frete pelo checkout.' }, 405)
  try {
   if (!req.headers.get('content-type')?.includes('application/json')) throw new ErroFrete(400, 'FORMATO_INVALIDO', 'Envie os dados do cálculo no formato correto.')
   if (Number(req.headers.get('content-length')) > 12000) throw new ErroFrete(413, 'PEDIDO_GRANDE', 'O carrinho ultrapassa o tamanho permitido.')
   const texto = await lerCorpoLimitado(req)
   let corpo
   try { corpo = JSON.parse(texto) } catch { throw new ErroFrete(400, 'JSON_INVALIDO', 'Não foi possível ler os dados do cálculo.') }
   const pedido = validarPedido(corpo)
   if (!config.configurado) throw new ErroFrete(503, 'FRETE_NAO_CONFIGURADO', 'O cálculo de frete ainda não foi ativado pela loja. Tente novamente mais tarde.')
   const momento = agora()
   if (limites.size > 1000) for (const [id, limite] of limites) if (momento - limite.inicio > 60000) limites.delete(id)
   // Limite básico por IP encaminhado pelo proxy; sem IP, usa um grupo compartilhado.
   const origem = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'sem-ip'
   const anterior = limites.get(origem)
   const limite = anterior && momento - anterior.inicio < 60000 ? anterior : { inicio: momento, chamadas: 0 }
   if (++limite.chamadas > 15) throw new ErroFrete(429, 'MUITAS_CONSULTAS', 'Aguarde um minuto antes de calcular novamente.')
   limites.set(origem, limite)
   const pecas = await carregarPecas(pedido.itens.map(i => i.pecaId))
   const preparacao = prepararCotacao(pedido, pecas, config)
   const resposta = await consultarFrete(preparacao.payload)
   const opcoes = normalizarOpcoes(resposta)
   if (!opcoes.length) throw new ErroFrete(422, 'SEM_OPCOES', 'Nenhuma forma de envio está disponível para esse CEP e embalagem. Confira o CEP ou consulte a loja.')
   return json({ opcoes, subtotalCentavos: preparacao.subtotalCentavos, prazoProducaoDias: preparacao.prazoProducaoDias, ambiente: config.ambiente, cepOrigem: config.cepOrigem, embalagemFixaTeste: true, embalagem: { comprimentoCm: config.embalagem.length, larguraCm: config.embalagem.width, alturaCm: config.embalagem.height, pesoKg: config.embalagem.weight }, geradoEm: new Date(momento).toISOString(), expiraEm: new Date(momento + 600000).toISOString() })
  } catch (erro) {
   if (erro instanceof ErroFrete) return json({ codigo: erro.codigo, mensagem: erro.message }, erro.status)
   return json({ codigo: 'FRETE_INDISPONIVEL', mensagem: 'Não foi possível consultar o frete agora. Tente novamente.' }, 502)
  }
 }
}
