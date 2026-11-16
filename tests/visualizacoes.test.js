import test from 'node:test'
import assert from 'node:assert/strict'
import { criarServicoVisualizacoes } from '../src/servicos/visualizacoes.js'

const PECA_ID = '20000000-0000-4000-8000-000000000001'
const ABERTURA_ID = '30000000-0000-4000-8000-000000000001'
const registro = {
  id: PECA_ID, nome: 'Kit de berço florido', descricao: 'Peça artesanal para o enxoval.',
  preco_centavos: 18900, imagem_capa_url: 'https://example.test/kit.png',
  categoria: 'Enxovais', prazo_producao_dias: 7, visualizacoes: '24',
}

function preparar(responder) {
  const chamadas = []
  const cliente = {
    async rpc(nome, parametros) {
      const chamada = { nome, parametros }
      chamadas.push(chamada)
      return responder(chamada, chamadas)
    },
  }
  return { servico: criarServicoVisualizacoes({ cliente }), chamadas }
}

test('registro envia somente a peça e a abertura, normaliza UUID e preserva confirmação booleana', async () => {
  const { servico, chamadas } = preparar(() => ({ data: true, error: null }))
  assert.equal(await servico.registrarVisualizacao(' ' + PECA_ID.toUpperCase() + ' ', ABERTURA_ID), true)
  assert.deepEqual(chamadas, [{ nome: 'registrar_visualizacao_peca', parametros: { p_peca_id: PECA_ID, p_abertura_id: ABERTURA_ID } }])
})

test('evento já registrado ou ignorado pelo servidor retorna false sem repetir a requisição', async () => {
  const { servico, chamadas } = preparar(() => ({ data: false, error: null }))
  assert.equal(await servico.registrarVisualizacao(PECA_ID, ABERTURA_ID), false)
  assert.equal(chamadas.length, 1)
})

test('identificadores inválidos são rejeitados antes de chegar ao servidor', async () => {
  const { servico, chamadas } = preparar(() => assert.fail('Não deve consultar a API.'))
  for (const invalido of [null, undefined, '', 7, 'peca-inexistente']) {
    await assert.rejects(servico.registrarVisualizacao(invalido, ABERTURA_ID), /UUID válido/)
    await assert.rejects(servico.registrarVisualizacao(PECA_ID, invalido), /UUID válido/)
  }
  assert.equal(chamadas.length, 0)
})

test('resposta sem confirmação booleana não é tratada como visualização salva', async () => {
  for (const data of [null, undefined, 1, 'true', [], {}]) {
    const { servico } = preparar(() => ({ data, error: null }))
    await assert.rejects(servico.registrarVisualizacao(PECA_ID, ABERTURA_ID), /não confirmou/)
  }
})

test('ranking mapeia valores e preserva a ordenação definida no servidor', async () => {
  const segundo = { ...registro, id: ABERTURA_ID, nome: 'Almofada', visualizacoes: 3, prazo_producao_dias: 1 }
  const { servico, chamadas } = preparar(() => ({ data: [registro, segundo], error: null }))
  const destaques = await servico.listarDestaques({ limite: 3 })
  assert.deepEqual(destaques.map(peca => peca.nome), ['Kit de berço florido', 'Almofada'])
  assert.deepEqual(destaques[0], {
    id: PECA_ID, nome: registro.nome, descricao: registro.descricao, preco: 189,
    imagem: registro.imagem_capa_url, categoria: 'Enxovais', prazo: '7 dias úteis',
    prazoDias: 7, visivel: true, visualizacoes: 24,
  })
  assert.equal(destaques[1].prazo, '1 dia útil')
  assert.deepEqual(chamadas[0], { nome: 'listar_destaques_catalogo', parametros: { p_limite: 3, p_offset: 0 } })
})

test('lista completa percorre lotes para ultrapassar o limite de uma única consulta', async () => {
  const registros = Array.from({ length: 401 }, (_, indice) => ({
    ...registro, id: '20000000-0000-4000-8000-' + String(indice).padStart(12, '0'), visualizacoes: 401 - indice,
  }))
  const { servico, chamadas } = preparar(({ parametros }) => ({
    data: registros.slice(parametros.p_offset, parametros.p_offset + parametros.p_limite), error: null,
  }))
  const destaques = await servico.listarDestaques()
  assert.equal(destaques.length, 401)
  assert.deepEqual(destaques.map(item => item.id), registros.map(item => item.id))
  assert.deepEqual(chamadas.map(item => item.parametros), [
    { p_limite: 200, p_offset: 0 }, { p_limite: 200, p_offset: 200 }, { p_limite: 200, p_offset: 400 },
  ])
})

test('limite solicitado é respeitado inclusive quando atravessa mais de um lote', async () => {
  const registros = Array.from({ length: 300 }, (_, indice) => ({
    ...registro, id: '20000000-0000-4000-8000-' + String(indice).padStart(12, '0'),
  }))
  const { servico, chamadas } = preparar(({ parametros }) => ({
    data: registros.slice(parametros.p_offset, parametros.p_offset + parametros.p_limite), error: null,
  }))
  assert.equal((await servico.listarDestaques({ limite: 250 })).length, 250)
  assert.deepEqual(chamadas.map(item => item.parametros), [
    { p_limite: 200, p_offset: 0 }, { p_limite: 50, p_offset: 200 },
  ])
})

test('ausência de visualizações retorna lista vazia e limite zero evita consulta', async () => {
  const { servico, chamadas } = preparar(() => ({ data: [], error: null }))
  assert.deepEqual(await servico.listarDestaques(), [])
  assert.deepEqual(await servico.listarDestaques({ limite: 0 }), [])
  assert.equal(chamadas.length, 1)
})

test('quantidade inválida não inicia uma consulta', async () => {
  const { servico, chamadas } = preparar(() => assert.fail('Não deve consultar a API.'))
  for (const limite of [-1, 1.5, '3', null, Infinity, 2147483648]) {
    await assert.rejects(servico.listarDestaques({ limite }), /quantidade inteira/)
  }
  assert.equal(chamadas.length, 0)
})

test('contagens e valores inválidos do servidor não viram dados fictícios no ranking', async () => {
  for (const campo of ['visualizacoes', 'preco_centavos', 'prazo_producao_dias']) {
    for (const valor of [0, -1, 1.5, null, true, '', '3.5', '9007199254740993']) {
      const { servico } = preparar(() => ({ data: [{ ...registro, [campo]: valor }], error: null }))
      await assert.rejects(servico.listarDestaques(), /inválido/)
    }
  }
})

test('resposta inválida ou repetição de página exige uma nova consulta', async () => {
  for (const data of [null, {}, { registros: [] }]) {
    const { servico } = preparar(() => ({ data, error: null }))
    await assert.rejects(servico.listarDestaques(), /lista válida/)
  }
  const { servico } = preparar(() => ({ data: [registro, registro], error: null }))
  await assert.rejects(servico.listarDestaques(), /mudaram durante a consulta/)
})

test('falhas de consulta são diferenciadas de ausência de dados e permitem nova leitura', async () => {
  const { servico } = preparar((_, chamadas) => chamadas.length === 1
    ? { data: null, error: { code: '42501' } }
    : { data: [registro], error: null })
  await assert.rejects(servico.listarDestaques(), /não tem permissão/)
  assert.equal((await servico.listarDestaques()).length, 1)
})

test('serviço indisponível e migração ausente têm mensagens próprias', async () => {
  const semCliente = criarServicoVisualizacoes()
  await assert.rejects(semCliente.listarDestaques(), /não está configurado/)
  for (const codigo of ['PGRST202', '42883', '42P01', 'PGRST205']) {
    const { servico } = preparar(() => ({ data: null, error: { code: codigo } }))
    await assert.rejects(servico.listarDestaques(), /ainda não estão disponíveis/)
  }
})

test('falha de rede não revela a mensagem interna retornada pelo servidor', async () => {
  const { servico } = preparar(() => { throw new Error('detalhe interno de conexão') })
  await assert.rejects(servico.listarDestaques(), erro => {
    assert.equal(erro.message, 'Não foi possível carregar os destaques do catálogo. Tente novamente.')
    assert.equal(erro.cause.message, 'detalhe interno de conexão')
    return true
  })
})
