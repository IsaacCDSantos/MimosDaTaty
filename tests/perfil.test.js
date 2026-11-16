import { destinoAposLogin } from '../src/servicos/destinoLogin.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { criarServicoPerfil, normalizarDadosPessoais, normalizarEndereco } from '../src/servicos/perfilModelo.js'

const USUARIO_ID = '10000000-0000-4000-8000-000000000001'
const OUTRO_ID = '10000000-0000-4000-8000-000000000002'
const ENDERECO_ID = '20000000-0000-4000-8000-000000000001'
const OUTRO_ENDERECO_ID = '20000000-0000-4000-8000-000000000002'
const NOVO_ENDERECO_ID = '20000000-0000-4000-8000-000000000003'
const usuario = { id: USUARIO_ID, email: 'conta@example.com', user_metadata: { nome: 'Nome do cadastro' } }
const perfil = {
  id: USUARIO_ID, nome_completo: 'Pessoa Exemplo', telefone: '00900000000',
  cpf: null, perfil: 'cliente', email: 'ignorar@example.com',
}
const endereco = {
  id: ENDERECO_ID, cliente_id: USUARIO_ID, destinatario: 'Pessoa Exemplo', cep: '00000000',
  logradouro: 'Rua Exemplo', numero: '10', complemento: null, bairro: 'Bairro Exemplo',
  cidade: 'Cidade Exemplo', uf: 'CE', principal: true, ponto_referencia: 'Referência preservada', criado_em: '2026-01-01',
}
const dadosEndereco = {
  destinatario: ' Pessoa Exemplo ', cep: '00000-000', logradouro: ' Rua Exemplo ', numero: ' 10 ',
  complemento: ' ', bairro: ' Bairro Exemplo ', cidade: ' Cidade Exemplo ', uf: ' ce ',
}

function clienteFalso({ perfis = [perfil], enderecos = [endereco], usuarios = [usuario], falhas = {} } = {}) {
  const estado = {
    perfis: structuredClone(perfis), enderecos: structuredClone(enderecos),
    consultas: [], autenticacoes: 0,
  }
  let ultimoUsuario = usuarios[0]
  const filaUsuarios = [...usuarios]
  const fonteFalhas = Object.fromEntries(Object.entries(falhas).map(([chave, fila]) => [chave, [...fila]]))
  const cliente = {
    auth: {
      async getUser() {
        estado.autenticacoes++
        if (filaUsuarios.length) ultimoUsuario = filaUsuarios.shift()
        if (ultimoUsuario instanceof Error) throw ultimoUsuario
        if (ultimoUsuario?.resposta) return ultimoUsuario.resposta
        return { data: { user: ultimoUsuario }, error: null }
      },
    },
    from(tabela) {
      assert.ok(['perfis', 'enderecos_cliente'].includes(tabela))
      const consulta = { tabela, acao: 'select', valores: null, filtros: [], ordens: [], limite: null, colunas: null, unica: null }
      let promessa
      const builder = {
        select(colunas) { consulta.colunas = colunas; return builder },
        update(valores) { consulta.acao = 'update'; consulta.valores = structuredClone(valores); return builder },
        insert(valores) { consulta.acao = 'insert'; consulta.valores = structuredClone(valores); return builder },
        eq(campo, valor) { consulta.filtros.push([campo, valor]); return builder },
        order(campo, opcoes) { consulta.ordens.push([campo, opcoes]); return builder },
        limit(valor) { consulta.limite = valor; return builder },
        maybeSingle() { consulta.unica = 'maybe'; return builder },
        single() { consulta.unica = 'obrigatoria'; return builder },
        then(resolve, reject) {
          promessa ??= Promise.resolve().then(() => {
            estado.consultas.push(structuredClone(consulta))
            const falha = fonteFalhas[tabela + ':' + consulta.acao]?.shift()
            if (falha && !falha.efetivar) {
              if (falha.rejeitar) throw falha.rejeitar
              return falha.resposta ?? { data: null, error: falha.error ?? null }
            }
            const fonte = tabela === 'perfis' ? estado.perfis : estado.enderecos
            let linhas = fonte.filter(linha => consulta.filtros.every(([campo, valor]) => linha[campo] === valor))
            if (consulta.acao === 'update') linhas.forEach(linha => Object.assign(linha, consulta.valores))
            else if (consulta.acao === 'insert') {
              const criada = { id: NOVO_ENDERECO_ID, ...consulta.valores }
              fonte.push(criada)
              linhas = [criada]
            }
            for (const [campo, opcoes] of [...consulta.ordens].reverse()) {
              linhas.sort((a, b) => String(a[campo]).localeCompare(String(b[campo])) * (opcoes?.ascending === false ? -1 : 1))
            }
            if (consulta.limite !== null) linhas = linhas.slice(0, consulta.limite)
            if (falha?.rejeitar) throw falha.rejeitar
            if (falha) return falha.resposta ?? { data: null, error: falha.error ?? null }
            if (linhas.length > 1 || (consulta.unica === 'obrigatoria' && !linhas.length)) {
              return { data: null, error: { code: 'PGRST116' } }
            }
            return { data: linhas[0] ? structuredClone(linhas[0]) : null, error: null }
          })
          return promessa.then(resolve, reject)
        },
      }
      return builder
    },
  }
  return { cliente, estado, servico: criarServicoPerfil(cliente) }
}

function erroCom(codigo, resultadoIncerto = false) {
  return erro => {
    assert.equal(erro.codigo, codigo)
    assert.equal(erro.resultadoIncerto, resultadoIncerto)
    return true
  }
}

test('dados pessoais normalizam telefone e permitem somente nome e telefone', () => {
  const dados = Object.freeze({ nomeCompleto: ' Pessoa Exemplo ', telefone: '(00) 90000-0000', cpf: 'ignorar', perfil: 'admin', id: OUTRO_ID, email: 'ignorar@example.com' })
  assert.deepEqual(normalizarDadosPessoais(dados), { nome_completo: 'Pessoa Exemplo', telefone: '00900000000' })
  for (const telefone of [undefined, null, '', '  ']) assert.equal(normalizarDadosPessoais({ nomeCompleto: 'Nome', telefone }).telefone, null)
  assert.equal(normalizarDadosPessoais({ nomeCompleto: 'Nome', telefone: '(00) 0000-0000' }).telefone, '0000000000')
  assert.equal(dados.nomeCompleto, ' Pessoa Exemplo ')
})

test('nome e telefone inválidos são recusados antes de chamar o serviço', async () => {
  const { servico, estado } = clienteFalso()
  for (const nomeCompleto of [null, '', 'A', 'x'.repeat(121)]) {
    await assert.rejects(servico.salvarDadosPessoais({ nomeCompleto }, USUARIO_ID), erroCom('DADOS_INVALIDOS'))
  }
  for (const telefone of ['telefone', '000', '000000000000', '+55 (00) 90000-0000', 1234567890, '(00) 90000-0000 ramal 1']) {
    await assert.rejects(servico.salvarDadosPessoais({ nomeCompleto: 'Nome', telefone }, USUARIO_ID), erroCom('TELEFONE_INVALIDO'))
  }
  assert.equal(normalizarDadosPessoais({ nomeCompleto: 'x'.repeat(120) }).nome_completo.length, 120)
  assert.equal(estado.autenticacoes, 0)
  assert.equal(estado.consultas.length, 0)
})

test('endereço normaliza CEP, UF e complemento e ignora campos protegidos', () => {
  const dados = Object.freeze({ ...dadosEndereco, id: OUTRO_ENDERECO_ID, cliente_id: OUTRO_ID, principal: false, ponto_referencia: 'não editar' })
  assert.deepEqual(normalizarEndereco(dados), {
    destinatario: 'Pessoa Exemplo', cep: '00000000', logradouro: 'Rua Exemplo', numero: '10',
    complemento: null, bairro: 'Bairro Exemplo', cidade: 'Cidade Exemplo', uf: 'CE',
  })
  assert.equal(normalizarEndereco({ ...dadosEndereco, cep: '00000000', complemento: ' Casa ' }).complemento, 'Casa')
  assert.equal(dados.uf, ' ce ')
})

test('validação de endereço recusa CEP, UF e comprimentos fora do contrato', () => {
  for (const cep of ['0000-0000', '00000x000', '0000000', '000000000', 12345678]) {
    assert.throws(() => normalizarEndereco({ ...dadosEndereco, cep }), erroCom('CEP_INVALIDO'))
  }
  for (const uf of ['ZZ', 'Ceará', '', null]) assert.throws(() => normalizarEndereco({ ...dadosEndereco, uf }), erroCom('UF_INVALIDA'))
  for (const [campo, minimo, maximo] of [['destinatario', 2, 120], ['logradouro', 2, 150], ['numero', 1, 20], ['bairro', 2, 100], ['cidade', 2, 100]]) {
    assert.throws(() => normalizarEndereco({ ...dadosEndereco, [campo]: 'x'.repeat(minimo - 1) }), erroCom('DADOS_INVALIDOS'))
    assert.throws(() => normalizarEndereco({ ...dadosEndereco, [campo]: 'x'.repeat(maximo + 1) }), erroCom('DADOS_INVALIDOS'))
    assert.equal(normalizarEndereco({ ...dadosEndereco, [campo]: 'x'.repeat(maximo) })[campo].length, maximo)
  }
  assert.throws(() => normalizarEndereco({ ...dadosEndereco, complemento: 'x'.repeat(151) }), erroCom('DADOS_INVALIDOS'))
  for (const dados of [null, [], 'texto']) {
    assert.throws(() => normalizarEndereco(dados), erroCom('DADOS_INVALIDOS'))
    assert.throws(() => normalizarDadosPessoais(dados), erroCom('DADOS_INVALIDOS'))
  }
})

test('carregamento usa Auth para e-mail e seleciona somente o próprio endereço principal', async () => {
  const { servico, estado } = clienteFalso({ enderecos: [
    { ...endereco, id: OUTRO_ENDERECO_ID, principal: false, criado_em: '2025-01-01' },
    { ...endereco, id: NOVO_ENDERECO_ID, cliente_id: OUTRO_ID, criado_em: '2024-01-01' },
    endereco,
  ] })
  assert.deepEqual(await servico.carregarPerfil(USUARIO_ID), {
    id: USUARIO_ID, nomeCompleto: 'Pessoa Exemplo', telefone: '(00) 90000-0000', email: 'conta@example.com',
    endereco: { id: ENDERECO_ID, destinatario: 'Pessoa Exemplo', cep: '00000-000', logradouro: 'Rua Exemplo', numero: '10', complemento: '', bairro: 'Bairro Exemplo', cidade: 'Cidade Exemplo', uf: 'CE', principal: true },
  })
  assert.equal(estado.autenticacoes, 1)
  assert.ok(estado.consultas.every(item => item.acao === 'select'))
  const consulta = estado.consultas.find(item => item.tabela === 'enderecos_cliente')
  assert.deepEqual(consulta.filtros, [['cliente_id', USUARIO_ID]])
  assert.deepEqual(consulta.ordens, [['principal', { ascending: false }], ['criado_em', { ascending: true }]])
  assert.equal(consulta.limite, 1)
  assert.equal(consulta.unica, 'maybe')
  assert.deepEqual(estado.consultas.find(item => item.tabela === 'perfis').filtros, [['id', USUARIO_ID]])
})

test('sem principal usa o endereço mais antigo e ausência de endereço retorna null', async () => {
  const dois = clienteFalso({ enderecos: [
    { ...endereco, principal: false, criado_em: '2026-02-01' },
    { ...endereco, id: OUTRO_ENDERECO_ID, principal: false, criado_em: '2026-01-01' },
  ] })
  assert.equal((await dois.servico.carregarPerfil()).endereco.id, OUTRO_ENDERECO_ID)
  const nenhum = clienteFalso({ enderecos: [] })
  assert.equal((await nenhum.servico.carregarPerfil()).endereco, null)
})

test('nome de metadata é apenas fallback de exibição quando nome do banco é null', async () => {
  for (const [nome, metadata, esperado] of [
    [null, { nome: ' Nome do cadastro ', full_name: 'Outro nome' }, 'Nome do cadastro'],
    [null, { full_name: ' Nome completo ' }, 'Nome completo'],
    [null, {}, ''], ['', { nome: 'Fallback' }, ''], ['Banco', { nome: 'Fallback' }, 'Banco'],
  ]) {
    const { servico, estado } = clienteFalso({ perfis: [{ ...perfil, nome_completo: nome, telefone: null }], usuarios: [{ ...usuario, user_metadata: metadata }] })
    const resposta = await servico.carregarPerfil()
    assert.equal(resposta.nomeCompleto, esperado)
    assert.equal(resposta.telefone, '')
    assert.ok(estado.consultas.every(item => item.acao === 'select'))
  }
})

test('sessão inexistente ou divergente nunca consulta dados e perfil ausente não é inventado', async () => {
  for (const [user, esperado, codigo] of [[null, undefined, 'LOGIN_NECESSARIO'], [null, USUARIO_ID, 'SESSAO_ALTERADA'], [{ ...usuario, id: OUTRO_ID }, USUARIO_ID, 'SESSAO_ALTERADA']]) {
    const { servico, estado } = clienteFalso({ usuarios: [user] })
    await assert.rejects(servico.carregarPerfil(esperado), erroCom(codigo))
    assert.equal(estado.consultas.length, 0)
  }
  const { servico } = clienteFalso({ perfis: [] })
  await assert.rejects(servico.carregarPerfil(), erroCom('PERFIL_NAO_ENCONTRADO'))
})

test('erros de consulta são seguros e respostas com outro dono são rejeitadas', async () => {
  const segredo = 'mensagem privada do servidor'
  const acesso = clienteFalso({ falhas: { 'perfis:select': [{ error: { code: '42501', message: segredo } }] } })
  await assert.rejects(acesso.servico.carregarPerfil(), erro => {
    assert.equal(erro.codigo, 'ACESSO_NEGADO')
    assert.ok(!erro.message.includes(segredo))
    return true
  })
  for (const [tabela, linha] of [['perfis', { ...perfil, id: OUTRO_ID }], ['enderecos_cliente', { ...endereco, cliente_id: OUTRO_ID }]]) {
    const falso = clienteFalso({ falhas: { [tabela + ':select']: [{ resposta: { data: linha, error: null } }] } })
    await assert.rejects(falso.servico.carregarPerfil(), erroCom('CONSULTA_INDISPONIVEL'))
  }
})

test('salvar perfil confirma a sessão novamente e atualiza só nome e telefone por id próprio', async () => {
  const { servico, estado } = clienteFalso()
  await servico.carregarPerfil(USUARIO_ID)
  const dados = Object.freeze({ nomeCompleto: ' Novo Nome ', telefone: '(00) 0000-0000', id: OUTRO_ID, perfil: 'admin', cpf: 'ignorar', email: 'ignorar@example.com' })
  assert.deepEqual(await servico.salvarDadosPessoais(dados, { id: USUARIO_ID }), { id: USUARIO_ID, nomeCompleto: 'Novo Nome', telefone: '(00) 0000-0000' })
  assert.equal(estado.autenticacoes, 2)
  const consulta = estado.consultas.find(item => item.acao === 'update')
  assert.deepEqual(consulta.valores, { nome_completo: 'Novo Nome', telefone: '0000000000' })
  assert.deepEqual(consulta.filtros, [['id', USUARIO_ID]])
  assert.equal(consulta.unica, 'obrigatoria')
  assert.equal(estado.perfis[0].perfil, 'cliente')
  assert.equal(estado.perfis[0].cpf, null)
  assert.equal(estado.perfis[0].email, 'ignorar@example.com')
  assert.equal(dados.nomeCompleto, ' Novo Nome ')
})

test('troca de conta após carregar impede salvar e gravações exigem usuário esperado válido', async () => {
  const { servico, estado } = clienteFalso({ usuarios: [usuario, { ...usuario, id: OUTRO_ID }] })
  await servico.carregarPerfil(USUARIO_ID)
  await assert.rejects(servico.salvarDadosPessoais({ nomeCompleto: 'Nome' }, USUARIO_ID), erroCom('SESSAO_ALTERADA'))
  assert.ok(estado.consultas.every(item => item.acao === 'select'))
  const falso = clienteFalso()
  for (const esperado of [undefined, null, '', 'invalido', {}]) {
    await assert.rejects(falso.servico.salvarDadosPessoais({ nomeCompleto: 'Nome' }, esperado), erroCom('SESSAO_ALTERADA'))
    await assert.rejects(falso.servico.salvarEndereco(dadosEndereco, esperado), erroCom('SESSAO_ALTERADA'))
  }
  assert.equal(falso.estado.autenticacoes, 0)
  assert.equal(falso.estado.consultas.length, 0)
})

test('erro de verificação da sessão antes de salvar não marca resultado incerto nem escreve', async () => {
  for (const falha of [new Error('offline'), { resposta: { data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0 } } }]) {
    const { servico, estado } = clienteFalso({ usuarios: [falha] })
    await assert.rejects(servico.salvarDadosPessoais({ nomeCompleto: 'Nome' }, USUARIO_ID), erroCom('SESSAO_INDISPONIVEL'))
    assert.equal(estado.consultas.length, 0)
  }
})

test('editar endereço exige id e dono e preserva principal, proprietário e referência', async () => {
  const { servico, estado } = clienteFalso()
  const resposta = await servico.salvarEndereco({ ...dadosEndereco, numero: '20', principal: false, cliente_id: OUTRO_ID, ponto_referencia: 'ignorar' }, USUARIO_ID, ENDERECO_ID)
  assert.equal(resposta.numero, '20')
  assert.equal(resposta.principal, true)
  assert.equal(resposta.cep, '00000-000')
  const consulta = estado.consultas[0]
  assert.equal(consulta.acao, 'update')
  assert.deepEqual(consulta.filtros, [['id', ENDERECO_ID], ['cliente_id', USUARIO_ID]])
  assert.ok(!('principal' in consulta.valores))
  assert.ok(!('cliente_id' in consulta.valores))
  assert.ok(!('ponto_referencia' in consulta.valores))
  assert.equal(estado.enderecos[0].cliente_id, USUARIO_ID)
  assert.equal(estado.enderecos[0].ponto_referencia, endereco.ponto_referencia)
})

test('primeiro endereço insere proprietário próprio e principal com confirmação de uma linha', async () => {
  const { servico, estado } = clienteFalso({ enderecos: [] })
  const resposta = await servico.salvarEndereco({ ...dadosEndereco, cliente_id: OUTRO_ID, principal: false }, USUARIO_ID)
  assert.equal(resposta.id, NOVO_ENDERECO_ID)
  assert.equal(resposta.principal, true)
  assert.equal(resposta.complemento, '')
  const consulta = estado.consultas[0]
  assert.equal(consulta.acao, 'insert')
  assert.equal(consulta.valores.cliente_id, USUARIO_ID)
  assert.equal(consulta.valores.principal, true)
  assert.equal(consulta.unica, 'obrigatoria')
  assert.deepEqual(consulta.filtros, [])
  assert.equal(estado.enderecos.length, 1)
})

test('endereço inválido ou de outra conta nunca é convertido em inserção', async () => {
  const invalido = clienteFalso()
  await assert.rejects(invalido.servico.salvarEndereco(dadosEndereco, USUARIO_ID, 'invalido'), erroCom('ENDERECO_INVALIDO'))
  assert.equal(invalido.estado.autenticacoes, 0)
  const outro = clienteFalso({ enderecos: [{ ...endereco, cliente_id: OUTRO_ID }] })
  await assert.rejects(outro.servico.salvarEndereco(dadosEndereco, USUARIO_ID, ENDERECO_ID), erroCom('PGRST116', true))
  assert.equal(outro.estado.enderecos[0].cliente_id, OUTRO_ID)
  assert.equal(outro.estado.consultas.length, 1)
  assert.equal(outro.estado.consultas[0].acao, 'update')
})

test('rejeição SQL confirmada é segura e conflito de endereço pede recarregar', async () => {
  const segredo = 'detalhes privados do servidor'
  for (const code of ['42501', '23514', '23503']) {
    const { servico } = clienteFalso({ falhas: { 'perfis:update': [{ error: { code, message: segredo, details: segredo } }] } })
    await assert.rejects(servico.salvarDadosPessoais({ nomeCompleto: 'Nome' }, USUARIO_ID), erro => {
      assert.equal(erro.codigo, code)
      assert.equal(erro.resultadoIncerto, false)
      assert.ok(!erro.message.includes(segredo))
      return true
    })
  }
  const conflito = clienteFalso({ falhas: { 'enderecos_cliente:insert': [{ error: { code: '23505', message: segredo } }] } })
  await assert.rejects(conflito.servico.salvarEndereco(dadosEndereco, USUARIO_ID), erro => {
    assert.equal(erro.codigo, '23505')
    assert.equal(erro.resultadoIncerto, false)
    assert.match(erro.message, /principal.*Recarregue/)
    return true
  })
})

test('erro de rede após escrita conserva resultado incerto sem repetir a operação', async () => {
  const { servico, estado } = clienteFalso({ falhas: { 'perfis:update': [{ efetivar: true, rejeitar: new Error('conexão interrompida') }] } })
  await assert.rejects(servico.salvarDadosPessoais({ nomeCompleto: 'Nome Gravado' }, USUARIO_ID), erro => {
    assert.equal(erro.resultadoIncerto, true)
    assert.match(erro.message, /Recarregue.*antes de tentar novamente/)
    return true
  })
  assert.equal(estado.perfis[0].nome_completo, 'Nome Gravado')
  assert.equal(estado.consultas.length, 1)
  const insercao = clienteFalso({ enderecos: [], falhas: { 'enderecos_cliente:insert': [{ efetivar: true, resposta: { data: null, error: null } }] } })
  await assert.rejects(insercao.servico.salvarEndereco(dadosEndereco, USUARIO_ID), erroCom('SALVAMENTO_NAO_CONFIRMADO', true))
  assert.equal(insercao.estado.enderecos.length, 1)
  assert.equal(insercao.estado.consultas.length, 1)
})

test('falta de confirmação e SQL de conexão jamais resultam em sucesso falso', async () => {
  for (const resposta of [
    { data: null, error: null }, { data: { ...perfil, id: OUTRO_ID }, error: null },
    { data: null, error: { code: '08006' } }, { data: null, error: { code: '40003' } },
    { data: null, error: { code: 'PGRST000' } },
  ]) {
    const { servico, estado } = clienteFalso({ falhas: { 'perfis:update': [{ resposta }] } })
    await assert.rejects(servico.salvarDadosPessoais({ nomeCompleto: 'Nome' }, USUARIO_ID), erro => erro.resultadoIncerto === true)
    assert.equal(estado.consultas.length, 1)
  }
  const errado = clienteFalso({ falhas: { 'enderecos_cliente:update': [{ resposta: { data: { ...endereco, cliente_id: OUTRO_ID }, error: null } }] } })
  await assert.rejects(errado.servico.salvarEndereco(dadosEndereco, USUARIO_ID, ENDERECO_ID), erroCom('SALVAMENTO_NAO_CONFIRMADO', true))
})


test('login retorna ao próprio perfil sem aceitar destinos externos ou mudar o retorno administrativo do checkout', () => {
  assert.equal(destinoAposLogin('cliente', '/meu-perfil'), '/meu-perfil')
  assert.equal(destinoAposLogin('admin', '/meu-perfil'), '/meu-perfil')
  assert.equal(destinoAposLogin('admin', '/checkout'), '/admin')
  assert.equal(destinoAposLogin('cliente', '/checkout'), '/checkout')
  assert.equal(destinoAposLogin('cliente', 'https://example.com/meu-perfil'), '/')
  assert.equal(destinoAposLogin('cliente', '/meu-perfil?redirect=externo'), '/')
})
