import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

let servidor
let InicioAdmin
let CatalogoAdminContext

before(async () => {
  servidor = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    logLevel: 'error',
  })
  ;({ default: InicioAdmin } = await servidor.ssrLoadModule('/src/paginas/Admin/InicioAdmin.jsx'))
  ;({ CatalogoAdminContext } = await servidor.ssrLoadModule('/src/paginas/Admin/CatalogoAdmin/catalogoContext.js'))
})

after(async () => {
  await servidor?.close()
})

function renderizar(estado = {}) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, {},
    React.createElement(CatalogoAdminContext.Provider, {
      value: { pecas: [], categorias: [], recarregar() {}, ...estado },
    }, React.createElement(InicioAdmin))))
}

const pecas = [
  { visivel: true },
  { visivel: true },
  { visivel: false },
  { visivel: true, arquivada: true },
]
const numerosDoResumo = /\d+ (?:peças? no catálogo|visíveis? na loja|ocultas?)/

test('início apresenta carregamento e mantém a atualização desabilitada sem mostrar contagens antigas', () => {
  const html = renderizar({ carregando: true, pecas })

  assert.match(html, /aria-busy="true"/)
  assert.match(html, /role="status">Carregando indicadores do catálogo/)
  assert.doesNotMatch(html, numerosDoResumo)
  assert.match(html, /<button[^>]*disabled[^>]*>Atualizar indicadores<\/button>/)
})

test('início comunica falha de consulta e permite tentar novamente sem apresentar catálogo vazio', () => {
  const html = renderizar({ erro: 'Não foi possível consultar o catálogo.', pecas })

  assert.match(html, /role="alert"/)
  assert.match(html, /Não foi possível consultar o catálogo\./)
  assert.match(html, />Tentar novamente<\/button>/)
  assert.doesNotMatch(html, numerosDoResumo)
})

test('início avisa quando a última gravação não foi confirmada e oferece uma nova consulta', () => {
  const html = renderizar({ confirmacaoPendente: true, pecas })

  assert.match(html, /role="alert"/)
  assert.match(html, /A última alteração ainda não foi confirmada/)
  assert.match(html, />Tentar novamente<\/button>/)
  assert.doesNotMatch(html, numerosDoResumo)
})

test('catálogo vazio carregado com sucesso mostra zero nos três indicadores', () => {
  const html = renderizar()

  assert.match(html, /0 peças no catálogo/)
  assert.match(html, /0 visíveis na loja/)
  assert.match(html, /0 ocultas/)
  assert.doesNotMatch(html, /role="alert"/)
})

test('início mostra três peças ativas, duas visíveis e uma oculta, sem contar a arquivada', () => {
  const html = renderizar({ pecas })

  assert.match(html, /3 peças no catálogo/)
  assert.match(html, /2 visíveis na loja/)
  assert.match(html, /1 oculta<\/span>/)
  assert.match(html, /aria-live="polite"/)
  assert.doesNotMatch(html, /role="alert"/)
})
