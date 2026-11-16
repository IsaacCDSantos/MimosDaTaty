import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

let servidor
let Header
let EstruturaContaCliente
let MenuContaCliente

before(async () => {
  servidor = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    logLevel: 'error',
  })
  ;({ default: Header } = await servidor.ssrLoadModule('/src/componentes/Header/Header.jsx'))
  ;({ EstruturaContaCliente, MenuContaCliente } = await servidor.ssrLoadModule('/src/componentes/ContaCliente/ContaCliente.jsx'))
})

after(async () => { await servidor?.close() })

function renderizar(elemento, rota) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [rota] }, elemento))
}

function cabecalho(html) {
  const resultado = html.match(/<header\b[\s\S]*?<\/header>/)
  assert.ok(resultado, 'A página deve apresentar um cabeçalho da loja')
  return resultado[0]
}

const paginas = [
  { rota: '/meu-perfil', titulo: 'Meu perfil', atual: 'perfil' },
  { rota: '/meus-pedidos', titulo: 'Meus pedidos', atual: 'pedidos' },
]

for (const pagina of paginas) {
  test(`${pagina.titulo} apresenta o mesmo cabeçalho e a mesma logo da loja`, () => {
    const html = renderizar(React.createElement(EstruturaContaCliente, { titulo: pagina.titulo }), pagina.rota)
    const compartilhado = cabecalho(renderizar(React.createElement(Header), pagina.rota))

    assert.equal(cabecalho(html), compartilhado)
    assert.equal((html.match(/<header\b/g) || []).length, 1)
    assert.match(compartilhado, /<nav aria-label="Navegação principal">/)
    assert.match(compartilhado, /<img[^>]+alt="Mimos da Tati"/)
    assert.match(compartilhado, /aria-label="Voltar ao início"/)
    assert.match(compartilhado, /aria-label="Ir para o carrinho"/)
    assert.doesNotMatch(html, /class="meu-perfil-header"/)
  })

  test(`links de ${pagina.titulo} apontam para as rotas e seções da loja mesmo em acesso direto`, () => {
    const html = cabecalho(renderizar(React.createElement(EstruturaContaCliente, { titulo: pagina.titulo }), pagina.rota))
    const navegacao = html.match(/<nav aria-label="Navegação principal">([\s\S]*?)<\/nav>/)?.[1]
    assert.ok(navegacao)

    const links = Array.from(navegacao.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g), match => [match[2].trim(), match[1]])
    assert.deepEqual(links, [
      ['Início', '/#inicio'],
      ['Catálogo', '/catalogo'],
      ['Sobre Nós', '/#sobre'],
      ['Contato', '/#contato'],
    ])
    assert.match(html, /<a\b[^>]*href="\/carrinho"/)
    assert.doesNotMatch(html, /href="#(?:inicio|sobre|contato)"/)
  })

  test(`${pagina.titulo} preserva o conteúdo da conta e os destinos do menu lateral`, () => {
    const filhos = React.createElement(React.Fragment, {},
      React.createElement(MenuContaCliente, { nomeCompleto: 'Marina Oliveira', atual: pagina.atual }),
      React.createElement('section', { 'aria-label': 'Conteúdo da conta' }, 'Conteúdo preservado'),
    )
    const html = renderizar(React.createElement(EstruturaContaCliente, {
      titulo: pagina.titulo,
      descricao: 'Descrição da página.',
      children: filhos,
    }), pagina.rota)
    const menu = html.match(/<nav class="meu-perfil-sidebar-nav"[\s\S]*?<\/nav>/)?.[0]
    assert.ok(menu)

    assert.match(html, new RegExp(`<h1>${pagina.titulo}</h1>`))
    assert.match(html, /Descrição da página\./)
    assert.match(html, /<section aria-label="Conteúdo da conta">Conteúdo preservado<\/section>/)
    assert.match(html, /Olá, Marina!/)
    assert.match(menu, /href="\/meu-perfil"/)
    assert.match(menu, /href="\/meus-pedidos"/)
    assert.match(menu, /href="\/"[^>]*>Voltar à loja<\/a>/)
    const linkAtivo = menu.match(/<a\b[^>]*aria-current="page"[^>]*>/)?.[0]
    assert.ok(linkAtivo)
    assert.match(linkAtivo, new RegExp(`href="${pagina.rota}"`))
    assert.equal((menu.match(/aria-current="page"/g) || []).length, 1)
  })
}
