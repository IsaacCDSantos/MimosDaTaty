import test from 'node:test'
import assert from 'node:assert/strict'
import { arquivarPeca, carregarCategoriasPecas, registrarImagemPeca, salvarPeca, validarDadosPeca, validarFoto } from '../src/servicos/pecasAdmin.js'
import { supabaseSimulado } from './apoio/supabaseSimulado.js'

const categoria = { id: '12345678-1234-1234-1234-123456789012', nome: 'Enxovais' }
const formulario = { nome: 'Manta', descricao: '  Algodão  ', preco: '189,90', categoria_id: categoria.id, prazo: '7 dias úteis', estoque: '3 unidades', visivel: true }
const dados = validarDadosPeca(formulario, [categoria])
const foto = { name: 'foto.png', type: 'image/png', size: 1024 }

function responderNormal(c) {
  if (c.armazenamento) return { data: {}, error: null }
  if (c.tabela === 'pecas') return { data: { id: c.dados.id || 'peca-id', imagem_capa_url: c.dados.imagem_capa_url, atualizado_em: 'versao-nova' }, error: null }
  if (c.tabela === 'peca_imagens') return { data: c.operacao === 'insert' ? { id: c.dados.id } : null, error: null }
  return { data: [categoria], error: null }
}

test('validação mantém centavos, unidades e dias dos campos existentes', () => {
  assert.equal(dados.preco_centavos, 18990)
  assert.equal(dados.estoque_atual, 3)
  assert.equal(dados.prazo_producao_dias, 7)
  assert.equal(dados.descricao, 'Algodão')
  const zero = validarDadosPeca({ ...formulario, estoque: '0', prazo: '1 dia útil', preco: '0.01' }, [categoria])
  assert.equal(zero.tipo_disponibilidade, 'sob_encomenda')
  assert.equal(zero.preco_centavos, 1)
})

test('rejeita intervalos, negativos, decimais e números fora do limite do PostgreSQL', () => {
  for (const prazo of ['7 a 10 dias', '-3', '1.5', '', '0', '2147483648']) assert.throws(() => validarDadosPeca({ ...formulario, prazo }, [categoria]), /prazo/)
  for (const estoque of ['-3', '1,5', '3 a 5', '', '2147483648']) assert.throws(() => validarDadosPeca({ ...formulario, estoque }, [categoria]), /estoque/)
  for (const preco of ['Infinity', '1,234', '0', '21474836,48']) assert.throws(() => validarDadosPeca({ ...formulario, preco }, [categoria]), /preço/)
  assert.throws(() => validarDadosPeca({ ...formulario, nome: 'A' }, [categoria]), /nome/)
})

test('categoria precisa ser UUID e constar na lista carregada; prévia não exige categoria real', () => {
  assert.throws(() => validarDadosPeca({ ...formulario, categoria_id: 'Enxovais' }, [categoria]), /categoria/)
  assert.throws(() => validarDadosPeca(formulario, []), /categoria/)
  assert.doesNotThrow(() => validarDadosPeca({ ...formulario, categoria_id: 'Maternidade' }, [], true))
})

test('cadastro exige foto válida antes de qualquer requisição', async () => {
  const cliente = supabaseSimulado(responderNormal)
  await assert.rejects(salvarPeca(cliente, { dados }), /foto/)
  assert.equal(cliente.chamadas.length, 0)
  assert.throws(() => validarFoto({ ...foto, type: 'text/plain' }), /Formato/)
  assert.throws(() => validarFoto({ ...foto, size: 5 * 1024 * 1024 + 1 }), /5 MB/)
})

test('cadastro confirma peça e foto, sem remover imagem associada', async () => {
  const cliente = supabaseSimulado(responderNormal)
  const resultado = await salvarPeca(cliente, { dados, foto })
  assert.equal(resultado.pendenciaImagem, null)
  const principal = cliente.chamadas.find(c => c.tabela === 'pecas' && !c.armazenamento)
  const galeria = cliente.chamadas.find(c => c.tabela === 'peca_imagens' && c.operacao === 'insert')
  assert.equal(principal.dados.id, galeria.dados.peca_id)
  assert.equal(principal.dados.imagem_capa_url, galeria.dados.imagem_url)
  assert.ok(!cliente.chamadas.some(c => c.operacao === 'remove'))
})

test('edição confirma versão e rejeita zero linhas; remove somente a foto recém-enviada', async () => {
  const cliente = supabaseSimulado(c => c.tabela === 'pecas' && !c.armazenamento ? { data: null, error: null } : responderNormal(c))
  await assert.rejects(salvarPeca(cliente, { dados, foto, id: 'peca-id', versao: 'antiga', imagemAtualUrl: 'foto-antiga' }), /não foi alterada/)
  const principal = cliente.chamadas.find(c => c.operacao === 'update')
  assert.deepEqual(principal.filtros, [['id', 'peca-id'], ['atualizado_em', 'antiga']])
  const upload = cliente.chamadas.find(c => c.operacao === 'upload')
  assert.deepEqual(cliente.chamadas.find(c => c.operacao === 'remove').caminhos, [upload.caminho])
  assert.ok(!cliente.chamadas.some(c => c.tabela === 'peca_imagens'))
})

test('falha confirmada no banco compensa upload; falha na limpeza é informada', async () => {
  const cliente = supabaseSimulado(c => {
    if (!c.armazenamento && c.tabela === 'pecas') return { data: null, error: { code: '23514', message: 'Restrição' }, status: 400 }
    if (c.operacao === 'remove') return { error: { message: 'Storage indisponível' } }
    return responderNormal(c)
  })
  await assert.rejects(salvarPeca(cliente, { dados, foto }), /foto enviada não pôde ser removida/)
  assert.equal(cliente.chamadas.filter(c => c.operacao === 'remove').length, 1)
})

test('resposta incerta nunca apaga foto potencialmente salva nem anuncia sucesso', async () => {
  for (const resposta of [{ data: null, error: { message: 'Rede' }, status: 0 }, { data: null, error: null, status: 201 }]) {
    const cliente = supabaseSimulado(c => c.tabela === 'pecas' && !c.armazenamento ? resposta : responderNormal(c))
    await assert.rejects(salvarPeca(cliente, { dados, foto }), erro => erro.resultadoIncerto === true && !!erro.idPeca)
    assert.ok(!cliente.chamadas.some(c => c.operacao === 'remove'))
  }
})

test('falha da galeria retorna pendência sem repetir a gravação principal', async () => {
  let falhar = true
  const cliente = supabaseSimulado(c => {
    if (falhar && c.tabela === 'peca_imagens' && c.operacao === 'insert') return { data: null, error: { message: 'Erro' } }
    return responderNormal(c)
  })
  const resultado = await salvarPeca(cliente, { dados, foto })
  assert.ok(resultado.peca.id)
  assert.ok(resultado.pendenciaImagem)
  falhar = false
  await registrarImagemPeca(cliente, resultado.pendenciaImagem)
  assert.equal(cliente.chamadas.filter(c => !c.armazenamento && c.tabela === 'pecas').length, 1)
  const inserts = cliente.chamadas.filter(c => c.tabela === 'peca_imagens' && c.operacao === 'insert')
  assert.equal(inserts[0].dados.id, inserts[1].dados.id)
  assert.ok(!cliente.chamadas.some(c => c.operacao === 'remove'))
})

test('repetir registro de foto já confirmado não duplica galeria', async () => {
  const cliente = supabaseSimulado(() => ({ data: { id: 'foto-id' }, error: null }))
  await registrarImagemPeca(cliente, { id: 'foto-id', peca_id: 'peca-id', imagem_url: 'foto-url' })
  assert.equal(cliente.chamadas.length, 1)
  assert.ok(!cliente.chamadas[0].operacao)
})

test('exclusão lógica exige versão e registro retornado', async () => {
  const cliente = supabaseSimulado(() => ({ data: null, error: null }))
  await assert.rejects(arquivarPeca(cliente, 'peca-id', 'antiga'), /não foi excluída/)
  assert.deepEqual(cliente.chamadas[0].dados, { arquivada: true, visivel: false })
  assert.deepEqual(cliente.chamadas[0].filtros, [['id', 'peca-id'], ['atualizado_em', 'antiga']])
})

test('falha de categorias não fornece opções fictícias para persistência', async () => {
  const cliente = supabaseSimulado(() => ({ data: null, error: { message: 'Falha' } }))
  await assert.rejects(carregarCategoriasPecas(cliente), /categorias/)
})
