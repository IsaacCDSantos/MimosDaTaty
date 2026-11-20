import test from 'node:test'
import assert from 'node:assert/strict'
import { criarServicoPecas } from '../src/servicos/pecas.js'
import { calcularIndicadoresCatalogo } from '../src/paginas/Admin/indicadoresCatalogo.js'

const URL_PROJETO = 'https://catalogo-exemplo.supabase.co'
const CATEGORIA_ID = '10000000-0000-4000-8000-000000000001'
const PECA_ID = '20000000-0000-4000-8000-000000000001'
const NOVA_ID = '20000000-0000-4000-8000-000000000002'
const FOTO_ID = '30000000-0000-4000-8000-000000000001'
const OUTRA_FOTO_ID = '30000000-0000-4000-8000-000000000002'
const FOTO_ANTIGA = URL_PROJETO + '/storage/v1/object/public/pecas/' + PECA_ID + '/foto-antiga.png'
const categoria = { id: CATEGORIA_ID, nome: 'Maternidade', ativa: true, ordem: 1 }
const registro = {
  atualizado_em: 'versao-1', id: PECA_ID, categoria_id: CATEGORIA_ID, nome: 'Kit de berço', descricao: 'Kit artesanal.',
  preco_centavos: 18900, imagem_capa_url: FOTO_ANTIGA, tipo_disponibilidade: 'pronta_entrega',
  estoque_atual: 3, prazo_producao_dias: 7, visivel: true, arquivada: false,
}
const formulario = {
  atualizadoEm: 'versao-1', nome: 'Kit de berço', descricao: 'Kit artesanal.', preco: '189,00', categoria: 'Maternidade',
  categoriaId: CATEGORIA_ID, prazo: '7 dias úteis', estoque: '3 unidades',
  tipoDisponibilidade: 'sob_encomenda', imagem: FOTO_ANTIGA, visivel: true,
}

function clienteFalso({ pecas = [registro], categorias = [categoria], falhas = {}, erroUpload = null, erroLimpeza = null, limiteApi = Infinity } = {}) {
  const estado = {
    pecas: structuredClone(pecas), categorias: structuredClone(categorias),
    consultas: [], uploads: [], remocoes: [], falhas,
  }
  const comCategoria = linha => ({
    ...linha,
    categoria: estado.categorias.find(item => item.id === linha.categoria_id) ?? null,
  })
  const cliente = {
    from(tabela) {
      const consulta = { tabela, acao: 'select', filtros: [], cursor: null, limite: null, ordens: [], colunas: null, unica: false, valores: null }
      let promessa
      const builder = {
        select(colunas) { consulta.colunas = colunas; return builder },
        insert(valores) { consulta.acao = 'insert'; consulta.valores = structuredClone(valores); return builder },
        update(valores) { consulta.acao = 'update'; consulta.valores = structuredClone(valores); return builder },
        eq(campo, valor) { consulta.filtros.push([campo, valor]); return builder },
        gt(campo, valor) { consulta.cursor = [campo, valor]; return builder },
        limit(valor) { consulta.limite = valor; return builder },
        order(campo, opcoes) { consulta.ordens.push([campo, opcoes]); return builder },
        single() { consulta.unica = true; return builder },
        then(resolve, reject) {
          promessa ??= Promise.resolve().then(() => {
            estado.consultas.push(structuredClone(consulta))
            const falha = estado.falhas[tabela + ':' + consulta.acao]?.shift()
            if (falha && !falha.confirmar) {
              if (falha.rejeitar) throw falha.rejeitar
              return { data: null, error: falha.error ?? null }
            }
            const fonte = tabela === 'categorias' ? estado.categorias : estado.pecas
            let linhas = fonte.filter(linha => consulta.filtros.every(([campo, valor]) => linha[campo] === valor))
            if (consulta.acao === 'insert') {
              if (fonte.some(linha => linha.id === consulta.valores.id)) return { data: null, error: { code: '23505' } }
              const criada = { ...consulta.valores }
              fonte.push(criada)
              linhas = [criada]
            } else if (consulta.acao === 'update') {
              linhas.forEach(linha => Object.assign(linha, consulta.valores))
            }
            for (const [campo, opcoes] of [...consulta.ordens].reverse()) {
              linhas.sort((a, b) => String(a[campo]).localeCompare(String(b[campo]), 'pt-BR', { numeric: true }) * (opcoes?.ascending === false ? -1 : 1))
            }
            if (consulta.cursor) linhas = linhas.filter(linha => linha[consulta.cursor[0]] > consulta.cursor[1])
            if (consulta.limite) linhas = linhas.slice(0, Math.min(consulta.limite, limiteApi))
            const dados = tabela === 'pecas' ? linhas.map(comCategoria) : linhas.map(item => ({ ...item }))
            if (falha?.rejeitar) throw falha.rejeitar
            if (falha) return { data: falha.semDados ? null : (consulta.unica ? dados[0] ?? null : dados), error: falha.error ?? null }
            if (consulta.unica && dados.length !== 1) return { data: null, error: { code: 'PGRST116' } }
            return { data: consulta.unica ? dados[0] : dados, error: null }
          })
          return promessa.then(resolve, reject)
        },
      }
      return builder
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, 'pecas')
        return {
          getPublicUrl(caminho) {
            return { data: { publicUrl: URL_PROJETO + '/storage/v1/object/public/pecas/' + caminho } }
          },
          async upload(caminho, arquivo, opcoes) {
            estado.uploads.push({ caminho, arquivo, opcoes })
            if (erroUpload) return { data: null, error: erroUpload }
            return { data: { path: caminho }, error: null }
          },
          async remove(caminhos) {
            estado.remocoes.push([...caminhos])
            return { data: null, error: erroLimpeza }
          },
        }
      },
    },
  }
  return { cliente, estado }
}

function preparar(opcoes = {}, ids = [FOTO_ID, OUTRA_FOTO_ID]) {
  const falso = clienteFalso(opcoes)
  let indice = 0
  const servico = criarServicoPecas({
    cliente: falso.cliente, urlSupabase: URL_PROJETO,
    gerarId: () => ids[indice++] ?? OUTRA_FOTO_ID,
  })
  return { ...falso, servico }
}

function foto(tipo = 'image/png') {
  return new Blob(['conteudo de teste'], { type: tipo })
}

test('categorias retornam contrato UI e a consulta respeita a ordenação', async () => {
  const { servico, estado } = preparar()
  assert.deepEqual(await servico.listarCategorias(), [categoria])
  assert.equal(estado.consultas[0].tabela, 'categorias')
  assert.deepEqual(estado.consultas[0].ordens.map(([campo]) => campo), ['id'])
})

test('listagem admin inclui ocultas, exclui arquivadas e converte centavos, prazo e categoria', async () => {
  const ocultaId = NOVA_ID
  const { servico, estado } = preparar({ pecas: [
    registro,
    { ...registro, id: ocultaId, visivel: false, estoque_atual: null, tipo_disponibilidade: 'sob_encomenda' },
    { ...registro, id: FOTO_ID, arquivada: true },
  ] })
  const lista = await servico.listarPecas()
  assert.equal(lista.length, 2)
  const peca = lista.find(item => item.id === PECA_ID)
  assert.equal(peca.preco, 189)
  assert.equal(peca.categoria, 'Maternidade')
  assert.equal(peca.categoriaId, CATEGORIA_ID)
  assert.equal(peca.prazoDias, 7)
  assert.equal(peca.prazo, '7 dias úteis')
  assert.equal(peca.tipoDisponibilidade, 'pronta_entrega')
  assert.equal(lista.find(item => item.id === ocultaId).estoque, 0)
  assert.deepEqual(estado.consultas[0].filtros, [['arquivada', false]])
  assert.match(estado.consultas[0].colunas, /categoria:categorias\(id,nome,ativa\)/)
})

test('consulta pública pede somente visíveis e não arquivadas', async () => {
  const { servico, estado } = preparar({ pecas: [
    registro, { ...registro, id: NOVA_ID, visivel: false }, { ...registro, id: FOTO_ID, arquivada: true },
  ] })
  assert.deepEqual((await servico.listarPecas({ somenteVisiveis: true })).map(item => item.id), [PECA_ID])
  assert.deepEqual(estado.consultas[0].filtros, [['arquivada', false], ['visivel', true]])
})

test('erros de consulta são úteis e não expõem a mensagem interna do servidor', async () => {
  const { servico } = preparar({ falhas: { 'pecas:select': [{ error: { code: '42501', message: 'SEGREDO_INTERNO token=123' } }] } })
  await assert.rejects(servico.listarPecas(), erro => /permissão/.test(erro.message) && !erro.message.includes('SEGREDO_INTERNO'))
})

test('inserção usa ID estável, preço em centavos, campos do esquema e confirmação single', async () => {
  const { servico, estado } = preparar()
  const criada = await servico.salvarPeca({ ...formulario, preco: '199,90' }, { idNovaPeca: NOVA_ID })
  assert.equal(criada.id, NOVA_ID)
  assert.equal(criada.preco, 199.9)
  assert.equal(criada.tipoDisponibilidade, 'sob_encomenda')
  const escrita = estado.consultas.find(item => item.acao === 'insert')
  assert.equal(escrita.valores.preco_centavos, 19990)
  assert.equal(escrita.valores.prazo_producao_dias, 7)
  assert.equal(escrita.valores.estoque_atual, 3)
  assert.equal(escrita.valores.categoria_id, CATEGORIA_ID)
  assert.equal(escrita.valores.arquivada, false)
  assert.equal(escrita.unica, true)
  assert.equal(estado.uploads.length, 0)
})

test('edição preserva ID e foto existente e grava a peça sempre sob encomenda', async () => {
  const { servico, estado } = preparar()
  const atualizada = await servico.salvarPeca({ ...formulario, nome: 'Kit atualizado', tipoDisponibilidade: 'pronta_entrega' }, { id: PECA_ID })
  assert.equal(atualizada.id, PECA_ID)
  assert.equal(atualizada.nome, 'Kit atualizado')
  assert.equal(atualizada.tipoDisponibilidade, 'sob_encomenda')
  assert.equal(atualizada.imagem, FOTO_ANTIGA)
  const escrita = estado.consultas.find(item => item.acao === 'update')
  assert.deepEqual(escrita.filtros, [['id', PECA_ID], ['arquivada', false], ['atualizado_em', 'versao-1']])
  assert.equal(Object.hasOwn(escrita.valores, 'id'), false)
  assert.equal(Object.hasOwn(escrita.valores, 'arquivada'), false)
  assert.equal(escrita.unica, true)
  assert.equal(estado.uploads.length, 0)
  assert.equal(estado.remocoes.length, 0)
})

test('visibilidade aplica alvo explícito e requer uma linha confirmada', async () => {
  const { servico, estado } = preparar()
  assert.equal((await servico.alterarVisibilidade(PECA_ID, false, 'versao-1')).visivel, false)
  assert.equal((await servico.alterarVisibilidade(PECA_ID, true, 'versao-1')).visivel, true)
  await assert.rejects(servico.alterarVisibilidade(PECA_ID, 'false', 'versao-1'), /visibilidade/)
  assert.equal(estado.pecas[0].visivel, true)
  await assert.rejects(servico.alterarVisibilidade(NOVA_ID, false, 'versao-1'), erro => erro.resultadoIncerto === false)
})

test('excluir arquiva e oculta, preservando registro, preço e foto para o histórico', async () => {
  const { servico, estado } = preparar()
  await servico.excluirPeca(PECA_ID, 'versao-1')
  assert.equal(estado.pecas.length, 1)
  assert.equal(estado.pecas[0].arquivada, true)
  assert.equal(estado.pecas[0].visivel, false)
  assert.equal(estado.pecas[0].imagem_capa_url, FOTO_ANTIGA)
  assert.equal(estado.pecas[0].preco_centavos, 18900)
  assert.deepEqual(await servico.listarPecas(), [])
  const escrita = estado.consultas.find(item => item.acao === 'update')
  assert.deepEqual(escrita.valores, { arquivada: true, visivel: false })
  assert.equal(escrita.unica, true)
  assert.equal(estado.remocoes.length, 0)
})

test('validação de todos os campos ocorre antes de upload ou escrita', async () => {
  const casos = [
    { nome: 'X' }, { preco: 0 }, { preco: '21474836,48' }, { prazo: 0 },
    { prazo: '7 a 10 dias úteis' }, { prazo: '7 dias úteis ou 10' }, { prazo: '1 dias úteis' },
    { estoque: -1 }, { estoque: 2147483648 }, { categoriaId: 'categoria-inválida' },
    { categoriaId: NOVA_ID }, { categoria: 'Enxovais' }, { tipoDisponibilidade: 'outro' },
  ]
  for (const invalido of casos) {
    const { servico, estado } = preparar()
    await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto(), ...invalido }, { idNovaPeca: NOVA_ID }))
    assert.equal(estado.uploads.length, 0, JSON.stringify(invalido))
    assert.equal(estado.consultas.some(item => item.acao !== 'select'), false)
  }
})

test('preço respeita o limite inteiro do Postgres e não arredonda centavos para fora da faixa', async () => {
  const { servico, estado } = preparar()
  await servico.salvarPeca({ ...formulario, preco: '21.474.836,47' }, { idNovaPeca: NOVA_ID })
  assert.equal(estado.pecas.find(item => item.id === NOVA_ID).preco_centavos, 2147483647)
  await assert.rejects(servico.salvarPeca({ ...formulario, preco: '21.474.836,48' }, { idNovaPeca: FOTO_ID }), /limite/)
})

test('prazo aceita apenas inteiro ou texto consistente, sem interpretar faixas ou aproximações', async () => {
  for (const [prazo, dias] of [[1, 1], ['1 dia útil', 1], [7, 7], ['7', 7], ['7 dias úteis', 7]]) {
    const { servico, estado } = preparar()
    const criada = await servico.salvarPeca({ ...formulario, prazo }, { idNovaPeca: NOVA_ID })
    assert.equal(criada.prazoDias, dias)
    assert.equal(estado.pecas.find(item => item.id === NOVA_ID).prazo_producao_dias, dias)
  }
  for (const prazo of ['7 dia útil', '1 dias úteis', '7 dias útil', 'até 7 dias úteis', 1.5, '0']) {
    const { servico } = preparar()
    await assert.rejects(servico.salvarPeca({ ...formulario, prazo }, { idNovaPeca: NOVA_ID }), /prazo/)
  }
})

test('foto exige Blob/File real, MIME permitido e tamanho dentro de 5 MB', async () => {
  const invalidas = [{ type: 'image/png', size: 1 }, foto('image/gif'), new Blob([], { type: 'image/png' }), new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' })]
  for (const fotoArquivo of invalidas) {
    const { servico, estado } = preparar()
    await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo }, { idNovaPeca: NOVA_ID }), /foto|arquivo/)
    assert.equal(estado.uploads.length, 0)
  }
})

test('upload usa UUIDs, extensão por MIME, bucket pecas e upsert false somente ao salvar', async () => {
  for (const [mime, extensao] of [['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/avif', 'avif']]) {
    const { servico, estado } = preparar()
    assert.equal(estado.uploads.length, 0)
    const criada = await servico.salvarPeca({ ...formulario, fotoArquivo: foto(mime), imagem: null }, { idNovaPeca: NOVA_ID })
    assert.equal(estado.uploads.length, 1)
    assert.equal(estado.uploads[0].caminho, NOVA_ID + '/' + FOTO_ID + '.' + extensao)
    assert.deepEqual(estado.uploads[0].opcoes, { contentType: mime, upsert: false })
    assert.equal(criada.imagem, URL_PROJETO + '/storage/v1/object/public/pecas/' + estado.uploads[0].caminho)
    assert.equal(estado.remocoes.length, 0)
  }
})

test('falha do upload impede qualquer escrita no banco', async () => {
  const { servico, estado } = preparar({ erroUpload: { status: 403, message: 'SEGREDO_INTERNO' } })
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto() }, { idNovaPeca: NOVA_ID }), erro => /permissão/.test(erro.message) && !erro.message.includes('SEGREDO'))
  assert.equal(estado.consultas.some(item => item.acao !== 'select'), false)
  assert.equal(estado.remocoes.length, 0)
})

test('erro SQL confirmado remove somente upload novo, sem tocar na foto antiga', async () => {
  const { servico, estado } = preparar({ falhas: { 'pecas:update': [{ error: { code: '23514', message: 'SEGREDO_INTERNO' } }] } })
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto(), tipoDisponibilidade: 'pronta_entrega' }, { id: PECA_ID }), erro => erro.resultadoIncerto === false && erro.codigo === '23514' && !erro.message.includes('SEGREDO'))
  assert.deepEqual(estado.remocoes, [[PECA_ID + '/' + FOTO_ID + '.png']])
  assert.equal(estado.pecas[0].imagem_capa_url, FOTO_ANTIGA)
})

test('resultado incerto preserva foto e ID; retry com mesmo ID não duplica a peça', async () => {
  const { servico, estado } = preparar({ falhas: { 'pecas:insert': [{ confirmar: true, error: { message: 'Failed to fetch' } }] } })
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto() }, { idNovaPeca: NOVA_ID }), erro => erro.resultadoIncerto === true && erro.idNovaPeca === NOVA_ID && /confirmar/.test(erro.message))
  assert.equal(estado.remocoes.length, 0)
  assert.equal(estado.pecas.filter(item => item.id === NOVA_ID).length, 1)
  const primeiraFoto = estado.pecas.find(item => item.id === NOVA_ID).imagem_capa_url
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto() }, { idNovaPeca: NOVA_ID }), erro => erro.codigo === '23505')
  assert.equal(estado.pecas.filter(item => item.id === NOVA_ID).length, 1)
  assert.equal(estado.pecas.find(item => item.id === NOVA_ID).imagem_capa_url, primeiraFoto)
  assert.deepEqual(estado.remocoes, [[NOVA_ID + '/' + OUTRA_FOTO_ID + '.png']])
})

test('resposta sem linha após escrita nunca produz sucesso falso nem remove foto possivelmente referenciada', async () => {
  const { servico, estado } = preparar({ falhas: { 'pecas:update': [{ confirmar: true, semDados: true }] } })
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto(), tipoDisponibilidade: 'pronta_entrega' }, { id: PECA_ID }), erro => erro.resultadoIncerto === true)
  assert.equal(estado.remocoes.length, 0)
  assert.equal(estado.pecas[0].imagem_capa_url, URL_PROJETO + '/storage/v1/object/public/pecas/' + PECA_ID + '/' + FOTO_ID + '.png')
})

test('falha na limpeza não esconde a falha original nem inventa rollback da foto', async () => {
  const { servico, estado } = preparar({ erroLimpeza: { message: 'Sem permissão' }, falhas: { 'pecas:insert': [{ error: { code: '42501' } }] } })
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto() }, { idNovaPeca: NOVA_ID }), erro => erro.codigo === '42501' && erro.fotoPendente === true && erro.resultadoIncerto === false)
  assert.equal(estado.remocoes.length, 1)
})

test('serviço sem configuração falha de forma útil quando chamado e edição sem disponibilidade fica sob encomenda', async () => {
  const ausente = criarServicoPecas()
  await assert.rejects(ausente.listarPecas(), /não está configurado/)
  const { servico } = preparar()
  const atualizada = await servico.salvarPeca({ ...formulario, tipoDisponibilidade: undefined }, { id: PECA_ID })
  assert.equal(atualizada.tipoDisponibilidade, 'sob_encomenda')
})

test('paginação inclui todas as peças e categorias mesmo com limite da API menor que o lote', async () => {
  const pecas = Array.from({ length: 1005 }, (_, i) => ({ ...registro, id: '20000000-0000-4000-8000-' + String(i + 1).padStart(12, '0') }))
  const categorias = Array.from({ length: 17 }, (_, i) => ({ ...categoria, id: '10000000-0000-4000-8000-' + String(i + 1).padStart(12, '0'), ordem: 17 - i }))
  const { servico } = preparar({ pecas, categorias, limiteApi: 7 })
  assert.equal((await servico.listarPecas()).length, 1005)
  assert.equal((await servico.listarPecas({ somenteVisiveis: true })).length, 1005)
  const lista = await servico.listarCategorias()
  assert.equal(lista.length, 17)
  assert.equal(lista[0].ordem, 1)
})

test('erro em lote posterior rejeita a listagem inteira', async () => {
  const { servico } = preparar({ falhas: { 'pecas:select': [{ confirmar: true }, { error: { code: '42501' } }] } })
  await assert.rejects(servico.listarPecas(), /permissão/)
})

test('nova categoria real pode ser usada sem alterar a lista de demonstração', async () => {
  const { servico } = preparar({ categorias: [{ ...categoria, nome: 'Decoração' }] })
  const criada = await servico.salvarPeca({ ...formulario, categoria: 'Decoração' }, { idNovaPeca: NOVA_ID })
  assert.equal(criada.categoria, 'Decoração')
})

test('peça alterada em outra sessão rejeita edição sem sobrescrever e remove só upload novo', async () => {
  const { servico, estado } = preparar({ pecas: [{ ...registro, atualizado_em: 'versao-2', nome: 'Nome de outra sessão' }] })
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto() }, { id: PECA_ID }), erro => !erro.resultadoIncerto && /outra sessão/.test(erro.message))
  assert.equal(estado.pecas[0].nome, 'Nome de outra sessão')
  assert.equal(estado.pecas[0].imagem_capa_url, FOTO_ANTIGA)
  assert.deepEqual(estado.remocoes, [[PECA_ID + '/' + FOTO_ID + '.png']])
})

test('visibilidade e exclusão também respeitam a versão carregada', async () => {
  const { servico, estado } = preparar({ pecas: [{ ...registro, atualizado_em: 'versao-2' }] })
  await assert.rejects(servico.alterarVisibilidade(PECA_ID, false, 'versao-1'), /outra sessão/)
  await assert.rejects(servico.excluirPeca(PECA_ID, 'versao-1'), /outra sessão/)
  assert.equal(estado.pecas[0].visivel, true)
  assert.equal(estado.pecas[0].arquivada, false)
})

test('edição sem versão é rejeitada antes do upload', async () => {
  const { servico, estado } = preparar()
  await assert.rejects(servico.salvarPeca({ ...formulario, atualizadoEm: undefined, fotoArquivo: foto() }, { id: PECA_ID }), /Recarregue/)
  assert.equal(estado.uploads.length, 0)
})

test('falha de limpeza é comunicada na mensagem apresentada ao usuário', async () => {
  const { servico } = preparar({ erroLimpeza: { message: 'Erro' }, falhas: { 'pecas:insert': [{ error: { code: '23514' } }] } })
  await assert.rejects(servico.salvarPeca({ ...formulario, fotoArquivo: foto() }, { idNovaPeca: NOVA_ID }), /remover a foto recém-enviada/)
})

test('indicadores relidos do serviço acompanham cadastro, ocultação, reexibição e arquivamento', async () => {
  const { servico, cliente } = preparar({ pecas: [
    registro,
    { ...registro, id: FOTO_ID, visivel: false },
    { ...registro, id: OUTRA_FOTO_ID, visivel: true, arquivada: true },
  ] })
  async function conferir(esperado) {
    const indicadores = calcularIndicadoresCatalogo(await servico.listarPecas())
    assert.deepEqual(indicadores, esperado)
    assert.equal(indicadores.total, indicadores.visiveis + indicadores.ocultas)
  }

  await conferir({ total: 2, visiveis: 1, ocultas: 1 })
  await servico.salvarPeca({ ...formulario, nome: 'Manta recém-cadastrada', estoque: 0 }, { idNovaPeca: NOVA_ID })
  await conferir({ total: 3, visiveis: 2, ocultas: 1 })
  await servico.alterarVisibilidade(PECA_ID, false, registro.atualizado_em)
  await conferir({ total: 3, visiveis: 1, ocultas: 2 })
  await servico.alterarVisibilidade(PECA_ID, true, registro.atualizado_em)
  await conferir({ total: 3, visiveis: 2, ocultas: 1 })
  await servico.excluirPeca(PECA_ID, registro.atualizado_em)
  await conferir({ total: 2, visiveis: 1, ocultas: 1 })

  const servicoReaberto = criarServicoPecas({ cliente, urlSupabase: URL_PROJETO })
  assert.deepEqual(calcularIndicadoresCatalogo(await servicoReaberto.listarPecas()), { total: 2, visiveis: 1, ocultas: 1 })
})

test('falha ao consultar as peças rejeita a leitura e nova consulta recupera os indicadores reais', async () => {
  const { servico } = preparar({ falhas: { 'pecas:select': [{ error: { code: '42501' } }] } })

  await assert.rejects(servico.listarPecas().then(calcularIndicadoresCatalogo), /permissão/)
  assert.deepEqual(calcularIndicadoresCatalogo(await servico.listarPecas()), { total: 1, visiveis: 1, ocultas: 0 })
})
