import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORIAS_CATALOGO, normalizarPeca, filtrarPorCategorias,
  adicionarPeca, editarPeca, alternarVisibilidade, excluirPeca,
} from '../src/paginas/Admin/CatalogoAdmin/catalogoModelo.js'

const fotoKit = '/src/assets/imagens/kit_berco_florido_figma.png'
const fotoManta = '/src/assets/imagens/manta_croche_bebe_figma.png'
const dadosValidos = {
  nome: 'Kit de berço florido',
  descricao: 'Conjunto artesanal com manta e acabamento delicado.',
  preco: '189,00',
  categoria: 'Maternidade',
  prazo: '7 dias úteis',
  estoque: '3 unidades',
  imagem: fotoKit,
  visivel: true,
}

function congelar(valor) {
  if (valor && typeof valor === 'object') {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

function criarLista() {
  return congelar([
    { id: 1, ...normalizarPeca(dadosValidos) },
    { id: 2, ...normalizarPeca({ ...dadosValidos, nome: 'Manta de crochê bebê', categoria: 'Enxovais', preco: 129, imagem: fotoManta }) },
    { id: 3, ...normalizarPeca({ ...dadosValidos, nome: 'Trocador de crochê', categoria: 'Crochê & Bordado', preco: 89 }) },
  ])
}

test('normaliza formulário sem modificar dados e mantém as quatro categorias', () => {
  const entrada = congelar({ ...dadosValidos, nome: '  Kit de berço  ', descricao: '  Descrição artesanal.  ', prazo: '  7 dias úteis  ' })
  assert.deepEqual(normalizarPeca(entrada), {
    nome: 'Kit de berço', descricao: 'Descrição artesanal.', preco: 189,
    categoria: 'Maternidade', prazo: '7 dias úteis', estoque: 3, imagem: fotoKit, visivel: true,
  })
  assert.equal(entrada.nome, '  Kit de berço  ')
  assert.deepEqual(CATEGORIAS_CATALOGO, ['Maternidade', 'Enxovais', 'Crochê & Bordado', 'Presentes'])
})

test('preço aceita BRL e duas casas, rejeitando zero, negativos, excesso de casas e valores inválidos', () => {
  assert.equal(normalizarPeca({ ...dadosValidos, preco: 'R$ 1.234,56' }).preco, 1234.56)
  assert.equal(normalizarPeca({ ...dadosValidos, preco: '129.90' }).preco, 129.9)
  assert.equal(normalizarPeca({ ...dadosValidos, preco: 0.1 + 0.2 }).preco, 0.3)
  for (const preco of ['', 0, -1, '0,00', '-1,00', '1,234', '12.345,678', '1e3', 1.005, NaN, Infinity]) {
    assert.throws(() => normalizarPeca({ ...dadosValidos, preco }), /preço/, String(preco))
  }
})

test('estoque aceita zero e o texto legado em unidades, mas exige inteiro não negativo', () => {
  assert.equal(normalizarPeca({ ...dadosValidos, estoque: 0 }).estoque, 0)
  assert.equal(normalizarPeca({ ...dadosValidos, estoque: '1 unidade' }).estoque, 1)
  assert.equal(normalizarPeca({ ...dadosValidos, estoque: ' 12 unidades ' }).estoque, 12)
  for (const estoque of ['', -1, 1.5, '1,5', '3 unidades extras', NaN, true]) {
    assert.throws(() => normalizarPeca({ ...dadosValidos, estoque }), /estoque/)
  }
})

test('campos obrigatórios, categoria e visibilidade são validados', () => {
  for (const campo of ['nome', 'descricao', 'prazo', 'imagem']) {
    assert.throws(() => normalizarPeca({ ...dadosValidos, [campo]: '  ' }), /Preencha/)
  }
  assert.throws(() => normalizarPeca({ ...dadosValidos, categoria: 'Categoria inexistente' }), /categoria válida/)
  assert.throws(() => normalizarPeca({ ...dadosValidos, visivel: 'true' }), /visível/)
  assert.throws(() => normalizarPeca(null), /inválidos/)
})

test('foto permite imports locais conhecidos, blob e formatos raster em data URL', () => {
  for (const imagem of [
    fotoKit,
    '/assets/kit_berco_florido_figma-AbCd123.png',
    '/MimosDaTaty/assets/manta_croche_bebe_figma-AbCd123.png',
    './assets/trocador_croche_figma-AbCd123.png',
    'blob:http://localhost:5173/foto-1',
    'blob:https://atelie.example/foto-2',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:image/jpeg;base64,/9j/AA==',
    'data:image/webp;base64,UklGRg==',
    'data:image/gif;base64,R0lGODlh',
  ]) {
    assert.equal(normalizarPeca({ ...dadosValidos, imagem }).imagem, imagem)
  }
})

test('foto rejeita esquemas executáveis, imagem remota, SVG e caminho local inventado', () => {
  for (const imagem of [
    'javascript:alert(1)', 'https://example.com/foto.png', '//example.com/foto.png',
    'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGgxPg==',
    'data:image/png;base64,***', 'blob:javascript:alert(1)',
    '/assets/foto-inexistente.png', '/assets/../kit_berco_florido_figma.png',
  ]) {
    assert.throws(() => normalizarPeca({ ...dadosValidos, imagem }), /foto/)
  }
})

test('filtros combinam categorias por OR; seleção vazia retorna todas sem modificar lista', () => {
  const lista = criarLista()
  const todas = filtrarPorCategorias(lista)
  assert.deepEqual(todas, lista)
  assert.notStrictEqual(todas, lista)
  assert.deepEqual(filtrarPorCategorias(lista, ['Maternidade', 'Enxovais']).map(peca => peca.id), [1, 2])
  assert.deepEqual(filtrarPorCategorias(lista, ['Enxovais', 'Enxovais']).map(peca => peca.id), [2])
  assert.deepEqual(filtrarPorCategorias(lista, ['Presentes']), [])
  assert.throws(() => filtrarPorCategorias(lista, ['Categoria inexistente']), /categorias válidas/)
  assert.equal(lista.length, 3)
})

test('adicionar usa ID explícito e permite encontrar nova peça na categoria Presentes', () => {
  const lista = criarLista()
  const atualizada = adicionarPeca(lista, { ...dadosValidos, nome: 'Presente artesanal', categoria: 'Presentes', visivel: false }, 4)
  assert.equal(lista.length, 3)
  assert.equal(atualizada.length, 4)
  assert.equal(atualizada[3].id, 4)
  assert.equal(atualizada[3].preco, 189)
  assert.equal(atualizada[3].visivel, false)
  assert.deepEqual(filtrarPorCategorias(atualizada, ['Presentes']).map(peca => peca.id), [4])
  assert.throws(() => adicionarPeca(lista, dadosValidos, 1), /Já existe/)
  assert.throws(() => adicionarPeca(lista, dadosValidos, '1'), /Já existe/)
  assert.throws(() => adicionarPeca(lista, dadosValidos), /identificador/)
})

test('editar preserva ID e demais registros, normaliza dados e aceita trocar foto', () => {
  const lista = criarLista()
  const atualizada = editarPeca(lista, '1', {
    ...dadosValidos, id: 99, nome: 'Kit atualizado', preco: '199,90',
    estoque: 0, imagem: fotoManta, visivel: false,
  })
  assert.equal(atualizada[0].id, 1)
  assert.equal(atualizada[0].nome, 'Kit atualizado')
  assert.equal(atualizada[0].preco, 199.9)
  assert.equal(atualizada[0].estoque, 0)
  assert.equal(atualizada[0].imagem, fotoManta)
  assert.strictEqual(atualizada[1], lista[1])
  assert.equal(lista[0].nome, dadosValidos.nome)
  assert.equal(lista[0].imagem, fotoKit)
  assert.throws(() => editarPeca(lista, 1, { ...dadosValidos, nome: '' }), /nome/)
})

test('ocultar e restaurar não removem a peça nem apagam seus dados', () => {
  const lista = criarLista()
  const oculta = alternarVisibilidade(lista, 1)
  assert.equal(oculta.length, lista.length)
  assert.deepEqual(oculta[0], { ...lista[0], visivel: false })
  assert.equal(lista[0].visivel, true)
  assert.strictEqual(oculta[1], lista[1])
  const restaurada = alternarVisibilidade(oculta, 1)
  assert.deepEqual(restaurada, lista)
  assert.notStrictEqual(restaurada, lista)
})

test('excluir remove somente o ID escolhido, sem modificar a lista anterior', () => {
  const lista = criarLista()
  const atualizada = excluirPeca(lista, 2)
  assert.deepEqual(atualizada.map(peca => peca.id), [1, 3])
  assert.deepEqual(lista.map(peca => peca.id), [1, 2, 3])
  assert.strictEqual(atualizada[0], lista[0])
})

test('editar, ocultar e excluir rejeitam ID inexistente', () => {
  const lista = criarLista()
  assert.throws(() => editarPeca(lista, 99, dadosValidos), /não foi encontrada/)
  assert.throws(() => alternarVisibilidade(lista, 99), /não foi encontrada/)
  assert.throws(() => excluirPeca(lista, 99), /não foi encontrada/)
  assert.throws(() => adicionarPeca(lista, { ...dadosValidos, preco: 0 }, 4), /preço/)
})
