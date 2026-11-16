<div align="center">

  <img src="./src/assets/imagens/logo-mimos-da-taty.png" alt="Logo Mimos da Tati" width="180" />

  # 🎀 Sistema Web - Mimos da Tati

  **Plataforma web de apresentação e e-commerce para ateliê de produtos artesanais e enxovais infantis.**

  <p>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://reactrouter.com/"><img src="https://img.shields.io/badge/React_Router-v7-CA4245?style=for-the-badge&logo=react-router&logoColor=white" alt="React Router" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
    <a href="https://eslint.org/"><img src="https://img.shields.io/badge/ESLint-10.10-4B32C3?style=for-the-badge&logo=eslint&logoColor=white" alt="ESLint" /></a>
    <img src="https://img.shields.io/badge/Status-Em_Desenvolvimento-F59E0B?style=for-the-badge" alt="Status" />
  </p>

</div>

---

## 📌 Sumário

- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Arquitetura e Backend](#arquitetura-e-backend)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Mapeamento de Rotas](#-mapeamento-de-rotas)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Integração Mercado Pago](#integração-mercado-pago)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Padrões de Desenvolvimento](#-padrões-de-desenvolvimento)
- [Desenvolvedores](#-desenvolvedores)
- [Licença](#-licença)

---

## 📖 Sobre o Projeto

O **Sistema Web Mimos da Tati** é uma aplicação web desenvolvida para modernizar a presença digital e a operação comercial do ateliê **Mimos da Tati**, fundado em 2006 pela artesã Tati. O ateliê é especializado na criação personalizada de **enxovais de bebê de alto padrão**, englobando peças em crochê e bordado como mantas, fraldas, toalhas, trocadores, kits de berço e itens decorativos.

A aplicação une a identidade visual acolhedora do artesanato a uma navegação responsiva, permitindo aos clientes:

- Conhecer a história, os diferenciais e os canais de atendimento do ateliê;
- Explorar o catálogo público de peças com filtros por categoria;
- Criar conta, autenticar-se com separação entre clientes e administradores e recuperar senha;
- Montar o carrinho, calcular o frete pelo CEP e realizar o checkout em ambiente de testes (Sandbox).

---

## ✨ Funcionalidades Principais

- 🏠 **Landing Page Completa (`/`)**: cabeçalho com navegação suave por âncoras, seção Hero, diferenciais do ateliê, história da artesã e canal de contato.
- 🔐 **Autenticação, Cadastro e Conta do Cliente (`/login`, `/cadastro`, `/meu-perfil`, `/meus-pedidos`, `/recuperar-senha`, `/confirmacao`, `/redefinir-senha`)**:
  - Login unificado com distinção entre **Cliente** e **Administrador** validada em `public.perfis` via Supabase Auth.
  - Cadastro de novos clientes com criação automática de perfil `cliente` via trigger SQL e fluxo completo de recuperação/redefinição de senha.
  - Área da conta autenticada com **Meu perfil** (edição de nome, telefone e endereço de entrega) e **Meus pedidos** (histórico, filtros por etapa e detalhes conectados ao Supabase).
- 🧶 **Vitrine & Catálogo (`/catalogo` e `/catalogo/:pecaSlug`)**: exibição de peças visíveis e não arquivadas conectadas ao Supabase (tabelas `categorias`, `pecas` e bucket `pecas` no Storage), filtro reativo por categorias e personalização da peça com detalhes e imagens de referência.
- 🛒 **Carrinho de Compras (`/carrinho`)**: ajuste de quantidades, remoção de itens, persistência local e integração direta com o checkout.
- 🛍️ **Checkout, Frete e Pagamento (`/checkout`)**:
  - Cotação de frete em tempo real por CEP via Edge Function `calcular-frete` (**SuperFrete**, em sandbox ou produção conforme configuração), com validação de preços e prazos no servidor.
  - Pagamento em ambiente **Sandbox** via **Mercado Pago (Checkout Transparente / Orders API)** com cartão (MercadoPago.js) e Pix (QR Code e copia e cola), orquestrado pela Edge Function `checkout` e atualizado por `mercado-pago-webhook`.
- 🧵 **Área Administrativa (`/admin/*`)**:
  - Rotas protegidas por verificação de sessão e perfil `admin`.
  - Gestão persistente do catálogo (cadastro, edição, upload de fotos, visibilidade e arquivamento) e painel de acompanhamento de pedidos.
  - Até três peças mais vistas no início e ranking completo em `/admin/destaques`, por aberturas dos detalhes na vitrine. Acessos de administradores não entram na contagem; peças ocultas ou arquivadas ficam fora do ranking.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **[React](https://react.dev/) 19 & [Vite](https://vite.dev/) 8** | Interface declarativa em componentes e build/HMR rápido. |
| **[React Router DOM](https://reactrouter.com/) v7** | Roteamento SPA com separação entre rotas públicas e privadas. |
| **[Supabase](https://supabase.com/)** | Autenticação, banco PostgreSQL com RLS, Storage e Edge Functions. |
| **TypeScript, JavaScript & Deno** | Código das Edge Functions para frete, checkout e webhook de pagamentos. |
| **SQL & PL/pgSQL** | Migrações, funções, gatilhos e regras de acesso no PostgreSQL. |
| **[Mercado Pago](https://www.mercadopago.com.br/developers) & [SuperFrete](https://superfrete.com/)** | Processamento de pagamentos (Sandbox) e cálculo de frete por CEP via servidor. |
| **CSS3 Modular & SVG** | Estilização temática responsiva com paleta pastel/terrosa e ícones vetoriais. |
| **[ESLint](https://eslint.org/) 10 & `node:test`** | Padronização de código e testes automatizados nativos do Node.js. |

---

## Arquitetura e Backend

O **frontend** é uma aplicação React com Vite. O **backend** roda na infraestrutura do Supabase e reúne autenticação, banco PostgreSQL, armazenamento de imagens e funções próprias para validar operações e integrar as APIs.

- `supabase/functions/`: Edge Functions `calcular-frete` (SuperFrete), `checkout` (Mercado Pago) e `mercado-pago-webhook` (notificações de pagamento), em TypeScript e JavaScript sobre Deno.
- `supabase/migrations/`: alterações do banco, regras de acesso por linha (RLS), funções e gatilhos para perfis, checkout e visualizações.
- `src/servicos/`: código do frontend que acessa os serviços do Supabase.

Nos módulos de frete e checkout, `index.ts` inicia o serviço, `handler.js` coordena as requisições e `modelo.js` reúne validações e transformação de dados. No checkout, `runtime.ts` concentra as conexões reais com o banco e o Mercado Pago, também reutilizadas pelo webhook. Essa separação permite testar o fluxo com serviços simulados.

---

## 📂 Estrutura do Projeto

```text
Sistema Web Mimos da Tati/
├── public/                     # Favicons e arquivos estáticos públicos
├── scripts/                    # Scripts auxiliares de verificação de conexão/RLS
├── src/
│   ├── assets/                 # Imagens, vídeos e ícones do projeto
│   ├── componentes/            # Componentes reutilizáveis (Header, Hero, Beneficios, Sobre, Contato, RecuperacaoLayout)
│   ├── paginas/                # Páginas públicas, autenticação, checkout e área administrativa
│   ├── rotas/                  # Roteamento modular (rotasPublicas, rotasPrivadas e fallback 404)
│   ├── servicos/               # Acesso do frontend ao Supabase e às Edge Functions
│   ├── App.jsx / main.jsx      # Raiz da aplicação React
├── supabase/
│   ├── functions/              # Edge Functions (calcular-frete, checkout, mercado-pago-webhook)
│   ├── migrations/             # Migrações SQL, RLS e triggers de banco
│   └── diagrama-banco.png      # Diagrama ER validado do banco de dados
├── tests/                      # Testes automatizados (node --test)
├── index.html                  # Template HTML principal
└── package.json                # Dependências e scripts npm
```

---

## 🗺️ Mapeamento de Rotas

| Rota | Acesso | Descrição |
| :--- | :--- | :--- |
| `/` | Público | Landing page institucional do ateliê. |
| `/catalogo`, `/catalogo/:pecaSlug` | Público | Vitrine de peças com filtro por categorias e tela de personalização/referências. |
| `/carrinho` | Público | Visualização e edição dos itens selecionados. |
| `/checkout` | Público (finalização autenticada) | Endereço, cotação de frete (SuperFrete) e pagamento Sandbox (Mercado Pago). |
| `/login` | Público | Autenticação de Cliente ou Administrador (`?perfil=admin`). |
| `/cadastro` | Público | Criação de conta de cliente. |
| `/meu-perfil` | Exige login | Dados pessoais e endereço de entrega do cliente. |
| `/meus-pedidos` | Exige login | Histórico, filtros por etapa e detalhes dos pedidos. |
| `/recuperar-senha`, `/confirmacao`, `/redefinir-senha` | Público (gravação exige sessão do link) | Fluxo de recuperação e alteração de senha. |
| `/admin`, `/admin/catalogo`, `/admin/pedidos`, `/admin/adicionar-peca`, `/admin/editar-peca` | Restrito (`admin`) | Painel administrativo conectado ao Supabase. |
| `/admin/destaques` | Restrito (`admin`) | Ranking das peças mais vistas, com contagens e retorno ao início administrativo. |
| `*` | — | Redireciona rotas inexistentes para `/`. |

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) **22.13+** ou **24+**
- **npm** (incluso no Node.js)

### Passo a passo local

1. **Clone e acesse o repositório:**
   ```bash
   git clone https://github.com/IsaacCDSantos/MimosDaTaty.git
   cd MimosDaTaty
   ```

2. **Instale as dependências:**
   ```bash
   npm ci
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz (não versionado) com as chaves públicas do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_do_supabase
   ```

4. **Prepare o banco e as Edge Functions no Supabase (opcional para vitrine pública; necessário para auth, catálogo real, frete e checkout):**
   - Use o projeto Supabase existente ou um banco com o esquema base de catálogo e pedidos preparado; as migrações versionadas dependem dessas tabelas. Aplique as migrações de `supabase/migrations/` em ordem.
   - Publique as funções `calcular-frete`, `checkout` e `mercado-pago-webhook`, respeitando as opções de `supabase/config.toml`.
   - Configure nos **Secrets** as variáveis listadas em [supabase/functions/.env.example](supabase/functions/.env.example). Tokens privados e assinatura do webhook nunca devem ir em variáveis `VITE_*`. A cotação de frete pode usar `production` enquanto o pagamento usa `sandbox`; cotar não contrata uma entrega.
   - Para promover um usuário a administrador, altere a coluna `perfil` para `'admin'` na tabela `public.perfis`.

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173`.

---

## Integração Mercado Pago

O checkout utiliza **Checkout Transparente / Orders API**, com cartão pelos campos seguros do MercadoPago.js e Pix. Os pagamentos estão restritos a **sandbox**, com credenciais mantidas nos Secrets do Supabase.

Endpoint do webhook para eventos `order` no projeto Supabase utilizado:

```text
https://pzzfuroafdulpfdtwdsi.supabase.co/functions/v1/mercado-pago-webhook?origem=checkout
```

O checkout permite retomar uma tentativa ativa, consultar seu status e cancelar um Pix pendente antes de trocar a forma de pagamento. O servidor confirma o cancelamento no provedor, preserva pagamentos aprovados e valida a assinatura das notificações.

**Limitações atuais:** pagamentos reais exigem homologação e alteração explícita do bloqueio de produção. Observações e imagens de personalização ficam no carrinho local e ainda não são persistidas no pedido.

---

## 📜 Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite. |
| `npm run build` | Gera o build de produção em `dist/`. |
| `npm run preview` | Visualiza localmente o build gerado em `dist/`. |
| `npm run lint` | Executa a validação de código com o ESLint. |
| `npm test` | Executa os testes automatizados com `node --test`. |

---

## 📐 Padrões de Desenvolvimento

- **Conventional Commits:** uso de prefixos semânticos (`feat:`, `fix:`, `docs:`, `refactor:`, `style:`).
- **Branches e Pull Requests:** isolamento de alterações em branches temáticas antes da integração na `main`.
- **Responsividade mobile:** consulte a matriz e o roteiro de validação em [docs/validacao-mobile.md](docs/validacao-mobile.md).

---

## 👥 Desenvolvedores

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/guirodrigues140507-code">
        <img src="https://github.com/guirodrigues140507-code.png" width="90px;" alt="Guilherme Rodrigues" style="border-radius: 50%;"/><br />
        <sub><b>Guilherme Rodrigues</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/IsaacCDSantos">
        <img src="https://github.com/IsaacCDSantos.png" width="90px;" alt="Isaac Coelho Santos" style="border-radius: 50%;"/><br />
        <sub><b>Isaac Coelho Santos</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/ViniciusCaminha">
        <img src="https://github.com/ViniciusCaminha.png" width="90px;" alt="Vinicius Caminha" style="border-radius: 50%;"/><br />
        <sub><b>Vinicius Caminha</b></sub>
      </a>
    </td>
  </tr>
</table>

- **Guilherme Rodrigues** — [@guirodrigues140507-code](https://github.com/guirodrigues140507-code)
- **Isaac Coelho Santos** — [@IsaacCDSantos](https://github.com/IsaacCDSantos)
- **Vinicius Caminha** — [@ViniciusCaminha](https://github.com/ViniciusCaminha)

---

## 📄 Licença

Projeto desenvolvido para o ateliê **Mimos da Tati**. Todos os direitos reservados ou sob licença interna do projeto.
