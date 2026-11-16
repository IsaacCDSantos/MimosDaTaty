import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

let servidor
let DestaquesAdmin
let InicioAdmin
let PainelDestaques
let ListaDestaques
let CatalogoAdminContext

before(async () => {
  servidor = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ default: DestaquesAdmin } = await servidor.ssrLoadModule('/src/paginas/Admin/Destaques/DestaquesAdmin.jsx'))
  ;({ default: PainelDestaques } = await servidor.ssrLoadModule('/src/paginas/Admin/Destaques/PainelDestaques.jsx'))
  ;({ default: ListaDestaques } = await servidor.ssrLoadModule('/src/paginas/Admin/Destaques/ListaDestaques.jsx'))
  ;({ default: InicioAdmin } = await servidor.ssrLoadModule('/src/paginas/Admin/InicioAdmin.jsx'))
  ;({ CatalogoAdminContext } = await servidor.ssrLoadModule('/src/paginas/Admin/CatalogoAdmin/catalogoContext.js'))
})
after(async () => { await servidor?.close() })

function renderizar(Componente, props = {}) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(Componente, props)))
}

const produtos = [
  { id: 'manta', nome: 'Manta delicada', descricao: 'Manta de algodão.', preco: 129, imagem: '/manta.png', visualizacoes: 1050 },
  { id: 'kit', nome: 'Kit bordado', descricao: 'Enxoval artesanal.', preco: 189, imagem: '/kit.png', visualizacoes: 1 },
]

test('página completa tem apenas a seta para voltar como ação e não inclui navegação da loja', () => {
  const html = renderizar(DestaquesAdmin)
  assert.match(html, /aria-label="Voltar à tela anterior"/)
  assert.equal((html.match(/<button\b/g) || []).length, 1)
  assert.doesNotMatch(html, /<nav\b|<a\b|ContaHeader|class="header"/)
  assert.match(html, /Destaques do catálogo/)
  assert.match(html, /role="status">Carregando produtos mais vistos/)
})

test('Ver todas do início abre a tela administrativa de destaques, sem direcionar à vitrine', () => {
  const contexto = { pecas: [], categorias: [], carregando: false, erro: '', recarregar() {} }
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, {}, React.createElement(CatalogoAdminContext.Provider, { value: contexto }, React.createElement(InicioAdmin))))
  assert.match(html, /aria-label="Ver todos os produtos mais vistos"[^>]*href="\/admin\/destaques"|href="\/admin\/destaques"[^>]*aria-label="Ver todos os produtos mais vistos"/)
  assert.doesNotMatch(html, /href="\/catalogo"/)
})

test('lista completa mantém a ordem do ranking, informa contagens e não abre produtos', () => {
  const html = renderizar(ListaDestaques, { destaques: produtos })
  assert.ok(html.indexOf('Manta delicada') < html.indexOf('Kit bordado'))
  assert.match(html, /1\.050 visualizações/)
  assert.match(html, /1 visualização<\/span>/)
  assert.match(html, /aria-label="1º lugar"/)
  assert.doesNotMatch(html, /<button\b|<a\b/)
})

test('lista compacta pode abrir os detalhes administrativos sem usar links da vitrine', () => {
  const html = renderizar(ListaDestaques, { destaques: produtos, compacto: true, aoSelecionar() {} })
  assert.equal((html.match(/<button\b/g) || []).length, 2)
  assert.match(html, /aria-label="Ver detalhes de Manta delicada"/)
  assert.doesNotMatch(html, /<a\b/)
})

test('carregamento dos destaques tem status próprio e não é confundido com ausência de visualizações', () => {
  const html = renderizar(PainelDestaques, { destaques: [], carregando: true })
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /role="status">Carregando produtos mais vistos/)
  assert.doesNotMatch(html, /Nenhuma peça recebeu/)
})

test('falha nos destaques oferece nova tentativa e não apresenta uma lista vazia como sucesso', () => {
  const html = renderizar(PainelDestaques, { destaques: [], carregando: false, erro: 'Falha na consulta.', recarregar() {} })
  assert.match(html, /role="alert"/)
  assert.match(html, /Tentar novamente/)
  assert.doesNotMatch(html, /Nenhuma peça recebeu|<ol\b/)
})

test('ausência de visualizações explica como os produtos entram no ranking', () => {
  const html = renderizar(PainelDestaques, { destaques: [], carregando: false, erro: '' })
  assert.match(html, /Nenhuma peça recebeu visualizações ainda/)
  assert.match(html, /detalhes forem abertos na vitrine/)
  assert.doesNotMatch(html, /role="alert"|Tentar novamente/)
})
