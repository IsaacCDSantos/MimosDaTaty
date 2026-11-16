import test from 'node:test'
import assert from 'node:assert/strict'
import { supabaseSimulado } from './apoio/supabaseSimulado.js'
import { carregarPedidosCliente, estadoPedidoCliente, FILTROS_PEDIDOS_CLIENTE, imagemPedidoCliente, mapearPedidoCliente } from '../src/servicos/pedidosCliente.js'

const DONO = '10000000-0000-4000-8000-000000000001'
const OUTRO = '10000000-0000-4000-8000-000000000002'
const URL_PROJETO = 'https://projeto.supabase.co'
const FOTO = URL_PROJETO + '/storage/v1/object/public/pecas/manta.png'
const idPedido = n => '20000000-0000-4000-8000-' + String(n).padStart(12, '0')
const idItem = n => '30000000-0000-4000-8000-' + String(n).padStart(12, '0')
function pedido(n = 1, dados = {}) {
  return {
    id: idPedido(n), numero_pedido: 1000 + n, cliente_id: DONO,
    criado_em: '2026-10-23T01:30:00-03:00', status_pedido: 'em_producao', status_pagamento: 'aprovado',
    forma_pagamento: 'pix', subtotal_centavos: 18900, frete_centavos: 2500, total_centavos: 21400,
    entrega_destinatario: 'Pessoa de teste', entrega_cep: '61940005', entrega_logradouro: 'Rua de Teste',
    entrega_numero: '120', entrega_complemento: null, entrega_bairro: 'Centro', entrega_cidade: 'Maranguape',
    entrega_uf: 'CE', entrega_ponto_referencia: 'Referência da entrega', observacao_cliente: 'Nome Clara',
    observacao_interna: 'NUNCA MOSTRAR', cliente_cpf_snapshot: '00000000000', cliente_email_snapshot: 'privado@example.com',
    codigo_rastreio: null, modalidade_frete: 'PAC', prazo_estimado_dias: 7,
    ...dados,
  }
}
function item(n = 1, dados = {}) {
  return {
    id: idItem(n), pedido_id: idPedido(1), nome_peca_snapshot: 'Kit de berço', imagem_url_snapshot: FOTO,
    preco_unitario_centavos: 18900, quantidade: 1, personalizacao: 'Nome Clara', prazo_producao_dias_snapshot: 5,
    ...dados,
  }
}
function criarCliente({ pedidos = [pedido()], itens = [item()], limiteApi = 200, usuarios = [DONO], responder, duranteAuth } = {}) {
  let autenticacoes = 0
  const cliente = supabaseSimulado(async chamada => {
    if (responder) {
      const resposta = await responder(chamada)
      if (resposta !== undefined) return resposta
    }
    const tabela = chamada.tabela === 'pedidos' ? pedidos : itens
    let linhas = tabela.filter(row => chamada.filtros.every(([campo, valor, operador]) => {
      if (operador === 'in') return valor.includes(row[campo])
      if (operador === 'gt') return row[campo] > valor
      return row[campo] === valor
    }))
    linhas = [...linhas].sort((a, b) => a.id.localeCompare(b.id))
    return { data: linhas.slice(0, Math.min(limiteApi, chamada.limite)), error: null }
  })
  cliente.supabaseUrl = URL_PROJETO
  cliente.auth = { async getUser() {
    const numero = autenticacoes++
    duranteAuth?.(numero)
    const resposta = usuarios[Math.min(numero, usuarios.length - 1)]
    if (resposta instanceof Error) throw resposta
    if (typeof resposta === 'object' && resposta?.resposta) return resposta.resposta
    return { data: { user: resposta ? { id: resposta } : null }, error: null }
  } }
  return { cliente, get autenticacoes() { return autenticacoes } }
}

test('leitura exige login verificado e o mesmo usuário esperado antes de consultar tabelas', async () => {
  for (const usuarios of [[null], [OUTRO], [{ resposta: { data: { user: null }, error: { status: 401, message: 'SEGREDO' } } }]]) {
    const { cliente } = criarCliente({ usuarios })
    await assert.rejects(carregarPedidosCliente(cliente, DONO), /conta|sessão/)
    assert.equal(cliente.chamadas.length, 0)
  }
  const { cliente } = criarCliente()
  for (const esperado of [undefined, '', 'inválido', { id: DONO }]) {
    await assert.rejects(carregarPedidosCliente(cliente, esperado), { codigo: 'SESSAO_ALTERADA' })
  }
  assert.equal(cliente.chamadas.length, 0)
})

test('configuração ausente é informada sem tentar uma consulta pública', async () => {
  await assert.rejects(carregarPedidosCliente(null, DONO), { codigo: 'SERVICO_INDISPONIVEL' })
})

test('falha de rede ao verificar sessão é segura e não lê tabelas', async () => {
  for (const resposta of [new Error('URL e dados privados'), { resposta: { error: { name: 'AuthRetryableFetchError', message: 'SEGREDO' } } }]) {
    const { cliente } = criarCliente({ usuarios: [resposta] })
    await assert.rejects(carregarPedidosCliente(cliente, DONO), erro => erro.codigo === 'SESSAO_INDISPONIVEL' && !erro.message.includes('SEGREDO'))
    assert.equal(cliente.chamadas.length, 0)
  }
})

test('select explícito e filtros de proprietário impedem carregar outros pedidos ou campos internos', async () => {
  const simulacao = criarCliente({ pedidos: [pedido(), pedido(2, { cliente_id: OUTRO })], itens: [item(), item(2, { pedido_id: idPedido(2) })] })
  const resultado = await carregarPedidosCliente(simulacao.cliente, DONO)
  assert.equal(resultado.length, 1)
  assert.equal(simulacao.autenticacoes, 2)
  for (const chamada of simulacao.cliente.chamadas) {
    assert.ok(!chamada.colunas.includes('*'))
    assert.ok(!/observacao_interna|cpf|cliente_email|cliente_telefone|detalhes_gateway/.test(chamada.colunas))
    if (chamada.tabela === 'pedidos') assert.deepEqual(chamada.filtros.find(f => f[0] === 'cliente_id'), ['cliente_id', DONO])
    else assert.deepEqual(chamada.filtros.find(f => f[0] === 'pedido_id'), ['pedido_id', [idPedido(1)], 'in'])
  }
  assert.equal(resultado[0].observacaoInterna, undefined)
  assert.equal(resultado[0].cliente_id, undefined)
  assert.equal(JSON.stringify(resultado).includes('NUNCA MOSTRAR'), false)
  assert.equal(JSON.stringify(resultado).includes('privado@example.com'), false)
})

test('conta trocada enquanto carrega nunca recebe a resposta anterior', async () => {
  const { cliente } = criarCliente({ usuarios: [DONO, OUTRO] })
  await assert.rejects(carregarPedidosCliente(cliente, DONO), { codigo: 'SESSAO_ALTERADA' })
})

test('mesmo uma resposta errada do servidor com outro proprietário é recusada', async () => {
  const { cliente } = criarCliente({ responder: chamada => chamada.tabela === 'pedidos' ? { data: [pedido(2, { cliente_id: OUTRO })] } : undefined })
  await assert.rejects(carregarPedidosCliente(cliente, DONO), { codigo: 'DADOS_PEDIDOS_INVALIDOS' })
  assert.equal(cliente.chamadas.some(c => c.tabela === 'itens_pedido'), false)
})

test('listagem vazia é real, não consulta itens e não cria pedidos fictícios', async () => {
  const { cliente } = criarCliente({ pedidos: [] })
  assert.deepEqual(await carregarPedidosCliente(cliente, DONO), [])
  assert.equal(cliente.chamadas.length, 1)
})

test('mapeamento conserva snapshots, centavos, pagamento e endereço sem usar catálogo ou perfil atuais', async () => {
  const { cliente } = criarCliente()
  const [p] = await carregarPedidosCliente(cliente, DONO)
  assert.equal(p.numero, '1001')
  assert.equal(p.dataCriacao, '2026-10-23T04:30:00.000Z')
  assert.equal(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric' }).format(new Date(p.dataCriacao)), '23')
  assert.equal(p.totalCentavos, 21400)
  assert.equal(p.subtotalCentavos, 18900)
  assert.equal(p.freteCentavos, 2500)
  assert.equal(p.descontoCentavos, 0)
  assert.equal(p.formaPagamento, 'Pix')
  assert.equal(p.pagamentoRotulo, 'Pagamento aprovado')
  assert.deepEqual(p.itens[0], { id: idItem(1), nome: 'Kit de berço', imagem: FOTO, quantidade: 1, personalizacao: 'Nome Clara', precoUnitarioCentavos: 18900, prazoProducaoDias: 5 })
  assert.deepEqual(p.endereco, { destinatario: 'Pessoa de teste', cep: '61940005', logradouro: 'Rua de Teste', numero: '120', complemento: '', bairro: 'Centro', cidade: 'Maranguape', uf: 'CE', referencia: 'Referência da entrega' })
  assert.deepEqual(p.datas, { pagoEm: null, enviadoEm: null, entregueEm: null, canceladoEm: null })
  assert.deepEqual(new Set(cliente.chamadas.map(c => c.tabela)), new Set(['pedidos', 'itens_pedido']))
})

test('paginação percorre respostas menores que 200 e busca itens em grupos de até 100 pedidos', async () => {
  const pedidos = Array.from({ length: 203 }, (_, i) => pedido(i + 1))
  const itens = Array.from({ length: 407 }, (_, i) => item(i + 1, { pedido_id: idPedido(1) }))
  const { cliente } = criarCliente({ pedidos, itens, limiteApi: 51 })
  const resultado = await carregarPedidosCliente(cliente, DONO)
  assert.equal(resultado.length, 203)
  assert.equal(resultado.find(p => p.id === idPedido(1)).itens.length, 407)
  const consultasPedidos = cliente.chamadas.filter(c => c.tabela === 'pedidos')
  assert.equal(consultasPedidos.length, 5)
  assert.ok(consultasPedidos.slice(1).every(c => c.filtros.some(f => f[0] === 'id' && f[2] === 'gt')))
  for (const chamada of cliente.chamadas.filter(c => c.tabela === 'itens_pedido')) {
    assert.ok(chamada.filtros.find(f => f[0] === 'pedido_id')[1].length <= 100)
  }
})

test('ordenação final usa criação decrescente e ID como desempate estável', async () => {
  const { cliente } = criarCliente({ pedidos: [pedido(3), pedido(2), pedido(1, { criado_em: '2026-10-24T12:00:00Z' })], itens: [] })
  assert.deepEqual((await carregarPedidosCliente(cliente, DONO)).map(p => p.id), [idPedido(1), idPedido(2), idPedido(3)])
})

test('pagina repetida, fora de ordem ou resposta não lista não produz lista parcial', async () => {
  for (const resposta of [{ data: [pedido(), pedido()] }, { data: [pedido(2), pedido(1)] }, { data: null }, { data: {} }]) {
    const { cliente } = criarCliente({ responder: () => resposta })
    await assert.rejects(carregarPedidosCliente(cliente, DONO), { codigo: 'DADOS_PEDIDOS_INVALIDOS' })
  }
})

test('item de pedido fora do lote é recusado em vez de anexado à conta atual', async () => {
  const { cliente } = criarCliente({ responder: chamada => chamada.tabela === 'itens_pedido' ? { data: [item(1, { pedido_id: idPedido(2) })] } : undefined })
  await assert.rejects(carregarPedidosCliente(cliente, DONO), { codigo: 'DADOS_PEDIDOS_INVALIDOS' })
})

test('falha SQL ou de rede não vaza o erro bruto nem substitui dados por exemplos', async () => {
  for (const resposta of [{ error: { code: '42501', message: 'SEGREDO SQL' } }, new Error('SEGREDO REDE')]) {
    const { cliente } = criarCliente({ responder: () => { if (resposta instanceof Error) throw resposta; return resposta } })
    await assert.rejects(carregarPedidosCliente(cliente, DONO), erro => erro.codigo === 'CONSULTA_PEDIDOS_INDISPONIVEL' && !erro.message.includes('SEGREDO'))
  }
})

test('falha ao buscar itens não devolve pedidos sem seus itens', async () => {
  const { cliente } = criarCliente({ responder: chamada => chamada.tabela === 'itens_pedido' ? { error: { message: 'Falhou' } } : undefined })
  await assert.rejects(carregarPedidosCliente(cliente, DONO), { codigo: 'CONSULTA_PEDIDOS_INDISPONIVEL' })
})

test('todos os filtros e etapas refletem o status real sem transformar pendência em aprovação', () => {
  assert.deepEqual(FILTROS_PEDIDOS_CLIENTE.map(f => f.chave), ['todos', 'pagamento_aprovado', 'em_producao', 'enviado', 'entregue'])
  assert.deepEqual(estadoPedidoCliente('novo', 'aprovado'), { chave: 'pagamento_aprovado', rotulo: 'Pagamento aprovado', etapa: 0, tom: 'andamento' })
  for (const [status, etapa] of [['em_producao', 1], ['enviado', 2], ['entregue', 3]]) {
    assert.equal(estadoPedidoCliente(status, 'aprovado').etapa, etapa)
    assert.equal(estadoPedidoCliente(status, 'pendente').etapa, null)
    assert.equal(estadoPedidoCliente(status, 'estornado').etapa, null)
    assert.equal(estadoPedidoCliente(status, 'pendente').chave, status)
  }
  for (const [pagamento, chave] of [['pendente', 'aguardando_pagamento'], ['recusado', 'pagamento_recusado'], ['cancelado', 'pagamento_cancelado'], ['estornado', 'pagamento_estornado']]) {
    assert.equal(estadoPedidoCliente('novo', pagamento).chave, chave)
    assert.equal(estadoPedidoCliente('novo', pagamento).etapa, null)
  }
  assert.equal(estadoPedidoCliente('cancelado', 'aprovado').chave, 'cancelado')
  assert.equal(estadoPedidoCliente('cancelado', 'aprovado').etapa, null)
  assert.equal(estadoPedidoCliente('inventado', 'aprovado').chave, 'status_indisponivel')
  assert.equal(estadoPedidoCliente('novo', 'inventado').chave, 'status_indisponivel')
})

test('cancelados e pagamentos pendentes permanecem disponíveis em Todos', async () => {
  const { cliente } = criarCliente({ pedidos: [pedido(1, { status_pedido: 'cancelado' }), pedido(2, { status_pedido: 'novo', status_pagamento: 'pendente' })], itens: [] })
  const resultado = await carregarPedidosCliente(cliente, DONO)
  assert.equal(resultado.length, 2)
  assert.deepEqual(resultado.map(p => p.estado.chave), ['cancelado', 'aguardando_pagamento'])
  assert.equal(cliente.chamadas.some(c => c.filtros.some(f => f[2] === 'neq')), false)
})

test('centavos, quantidades, prazos e datas inválidos não viram zero ou totais inventados', () => {
  for (const dados of [{ total_centavos: null }, { total_centavos: -1 }, { frete_centavos: '2500' }, { frete_centavos: -1 }, { subtotal_centavos: 0 }, { total_centavos: 21401 }, { total_centavos: NaN }, { total_centavos: 2147483648 }, { criado_em: 'inválido' }, { numero_pedido: 9007199254740992 }, { numero_pedido: '1e3' }]) {
    assert.throws(() => mapearPedidoCliente(pedido(1, dados)), { codigo: 'DADOS_PEDIDOS_INVALIDOS' })
  }
  for (const dados of [{ quantidade: 0 }, { quantidade: 1.5 }, { quantidade: null }, { preco_unitario_centavos: 0 }, { preco_unitario_centavos: '18900' }, { quantidade: 2147483647, preco_unitario_centavos: 2147483647 }, { prazo_producao_dias_snapshot: -1 }]) {
    assert.throws(() => mapearPedidoCliente(pedido(), [item(1, dados)]), { codigo: 'DADOS_PEDIDOS_INVALIDOS' })
  }
  assert.equal(mapearPedidoCliente(pedido(1, { numero_pedido: '9223372036854775807' })).numero, '9223372036854775807')
})

test('snapshots de textos opcionais e nomes ausentes têm apenas fallbacks informativos', () => {
  const p = mapearPedidoCliente(pedido(1, { forma_pagamento: 'constructor', status_pagamento: 'toString', enviado_em: 'inválido', observacao_cliente: null }), [item(1, { nome_peca_snapshot: null, personalizacao: null, prazo_producao_dias_snapshot: 0 })])
  assert.equal(p.formaPagamento, 'Não informada')
  assert.equal(p.pagamentoRotulo, 'Situação do pagamento não informada')
  assert.equal(p.datas.enviadoEm, null)
  assert.equal(p.observacaoCliente, '')
  assert.equal(p.itens[0].nome, 'Peça artesanal')
  assert.equal(p.itens[0].prazoProducaoDias, 0)
})

test('imagens aceitam Storage do projeto e arquivos locais conhecidos sem abrir esquemas ou rastreadores', () => {
  assert.equal(imagemPedidoCliente(FOTO, URL_PROJETO), FOTO)
  assert.equal(imagemPedidoCliente('/src/assets/imagens/kit_berco_florido_figma.png'), '/src/assets/imagens/kit_berco_florido_figma.png')
  assert.equal(imagemPedidoCliente('/assets/manta_croche_bebe_figma-Abc123.png'), '/assets/manta_croche_bebe_figma-Abc123.png')
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml;base64,abcd', 'blob:https://projeto.supabase.co/id', 'https://externo.test/peca.png', FOTO + '?rastreador=1', FOTO + '#x', FOTO.replace('https:', 'http:'), FOTO.replace('manta.png', 'vetor.svg'), FOTO.replace('/pecas/', '/privado/'), FOTO.replace('manta.png', 'pasta%2fimage.png'), 'https://nome:senha@projeto.supabase.co/storage/v1/object/public/pecas/manta.png', '/src/assets/imagens/inventada.png', null]) {
    assert.equal(imagemPedidoCliente(url, URL_PROJETO), null, String(url))
  }
  assert.equal(imagemPedidoCliente(FOTO), null)
})

test('cancelamento antes da sessão não autentica ou consulta dados', async () => {
  const controller = new AbortController()
  controller.abort()
  const simulacao = criarCliente()
  await assert.rejects(carregarPedidosCliente(simulacao.cliente, DONO, controller.signal), { name: 'AbortError' })
  assert.equal(simulacao.autenticacoes, 0)
  assert.equal(simulacao.cliente.chamadas.length, 0)
})

test('cancelamento durante a autenticação interrompe antes das consultas', async () => {
  const controller = new AbortController()
  const { cliente } = criarCliente({ duranteAuth: () => controller.abort() })
  await assert.rejects(carregarPedidosCliente(cliente, DONO, controller.signal), { name: 'AbortError' })
  assert.equal(cliente.chamadas.length, 0)
})

test('signal acompanha todas as consultas e cancelamento na leitura não retorna dados parciais', async () => {
  const controller = new AbortController()
  const { cliente } = criarCliente({ responder: chamada => {
    assert.equal(chamada.signal, controller.signal)
    if (chamada.tabela === 'itens_pedido') { controller.abort(); return { error: { message: 'Abortou' } } }
  } })
  await assert.rejects(carregarPedidosCliente(cliente, DONO, controller.signal), { name: 'AbortError' })
})
