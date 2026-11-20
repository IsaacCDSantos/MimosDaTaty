import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { slugDaPeca } from './src/servicos/slug.js'

// Endereço público do site. Se a loja ganhar domínio próprio, basta definir
// VITE_SITE_URL no Render: index.html, sitemap e robots passam a usá-lo.
const SITE_PADRAO = 'https://mimosdataty.onrender.com'
process.env.VITE_SITE_URL = (process.env.VITE_SITE_URL || SITE_PADRAO).replace(/\/+$/, '')

async function buscarPecasVisiveis(env) {
  const url = env.VITE_SUPABASE_URL?.trim()
  const chave = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !chave) return []
  try {
    const resposta = await fetch(`${url}/rest/v1/pecas?select=id,nome,atualizado_em&arquivada=eq.false&visivel=eq.true&order=nome`, {
      headers: { apikey: chave },
      signal: AbortSignal.timeout(8000),
    })
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status)
    const pecas = await resposta.json()
    return Array.isArray(pecas) ? pecas : []
  } catch (erro) {
    // O site nunca deixa de publicar por causa do sitemap: só as páginas fixas entram.
    console.warn('[seo] sitemap sem as peças:', erro.message)
    return []
  }
}

// Gera sitemap.xml (lista de páginas para o Google) e robots.txt a cada build.
function arquivosSeo() {
  let env
  return {
    name: 'arquivos-seo',
    apply: 'build',
    configResolved(config) { env = loadEnv(config.mode, config.envDir || config.root, '') },
    async generateBundle() {
      const site = process.env.VITE_SITE_URL
      const pecas = await buscarPecasVisiveis(env)
      const urls = [
        { loc: `${site}/`, prioridade: '1.0' },
        { loc: `${site}/catalogo`, prioridade: '0.9' },
        ...pecas.map(peca => ({ loc: `${site}/catalogo/${slugDaPeca(peca)}`, lastmod: String(peca.atualizado_em || '').slice(0, 10), prioridade: '0.8' })),
      ]
      const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + urls.map(u => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.prioridade}</priority></url>`).join('\n')
        + '\n</urlset>\n'
      const robots = [
        'User-agent: *',
        'Allow: /',
        '# Áreas privadas: não aparecem no Google.',
        'Disallow: /admin',
        'Disallow: /checkout',
        'Disallow: /meu-perfil',
        'Disallow: /meus-pedidos',
        '',
        `Sitemap: ${site}/sitemap.xml`,
        '',
      ].join('\n')
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      console.log(`[seo] sitemap com ${urls.length} páginas (${pecas.length} peças)`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), arquivosSeo()],
})
