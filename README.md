<div align="center">

  <img src="./src/assets/imagens/logo-mimos-da-taty.png" alt="Logo Mimos da Taty" width="180" />

  # 🎀 Sistema Web - Mimos da Taty

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
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Mapeamento de Rotas](#-mapeamento-de-rotas)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Padrões de Desenvolvimento](#-padrões-de-desenvolvimento)
- [Desenvolvedores](#-desenvolvedores)
- [Licença](#-licença)

---

## 📖 Sobre o Projeto

O **Sistema Web Mimos da Taty** é uma aplicação web desenvolvida para modernizar a presença digital e a operação comercial do ateliê **Mimos da Taty**, fundado em 2006 pela artesã Tati. O ateliê é especializado na criação personalizada de **enxovais de bebê de alto padrão**, englobando peças em crochê e bordado como mantas, fraldas, toalhas, trocadores, kits de berço e itens decorativos.

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
  - Cotação de frete em tempo real por CEP via Edge Function `calcular-frete` (**SuperFrete**, em sandbox), com validação de preços e prazos no servidor.
  - Pagamento em ambiente **Sandbox** via **Mercado Pago (Checkout Transparente / Orders API)** com cartão (MercadoPago.js) e Pix (QR Code e copia e cola), orquestrado pela Edge Function `checkout` e atualizado por `mercado-pago-webhook`.
- 🧵 **Área Administrativa (`/admin/*` e prévias em `/previa/admin/*`)**:
  - Rotas protegidas por verificação de sessão e perfil `admin`.
  - Gestão persistente do catálogo (cadastro, edição, upload de fotos, visibilidade e arquivamento) e painel de acompanhamento de pedidos.

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Descrição |
| :--- | :--- |
| **[React](https://react.dev/) 19 & [Vite](https://vite.dev/) 8** | Interface declarativa em componentes e build/HMR rápido. |
| **[React Router DOM](https://reactrouter.com/) v7** | Roteamento SPA com separação entre rotas públicas, prévias e privadas. |
| **[Supabase](https://supabase.com/)** | Autenticação, banco PostgreSQL com RLS, Storage e Edge Functions. |
| **[Mercado Pago](https://www.mercadopago.com.br/developers) & [SuperFrete](https://superfrete.com/)** | Processamento de pagamentos (Sandbox) e cálculo de frete por CEP via servidor. |
| **CSS3 Modular & SVG** | Estilização temática responsiva com paleta pastel/terrosa e ícones vetoriais. |
| **[ESLint](https://eslint.org/) 10 & `node:test`** | Padronização de código e testes automatizados nativos do Node.js. |

---

## 📂 Estrutura do Projeto

```text
Sistema Web Mimos da Taty/
├── public/                     # Favicons e arquivos estáticos públicos
├── scripts/                    # Scripts auxiliares de verificação de conexão/RLS
├── src/
│   ├── assets/                 # Imagens, vídeos e ícones do projeto
│   ├── componentes/            # Componentes reutilizáveis (Header, Hero, Beneficios, Sobre, Contato, RecuperacaoLayout)
│   ├── paginas/                # Páginas públicas, autenticação, checkout e área administrativa
│   ├── rotas/                  # Roteamento modular (rotasPublicas, rotasPrivadas e fallback 404)
│   ├── servicos/               # Integração com Supabase, checkout, frete e recuperação de senha
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
| `/previa/admin/*` | Público (demonstração) | Prévia navegável do painel administrativo com dados fictícios. |
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
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz (não versionado) com as chaves públicas do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica_do_supabase
   ```

4. **Prepare o banco e as Edge Functions no Supabase (opcional para vitrine pública; necessário para auth, catálogo real, frete e checkout):**
   - Aplique as migrações de `supabase/migrations/` no projeto Supabase.
   - Configure nos **Secrets** das Edge Functions os tokens de **Sandbox** (`SUPERFRETE_TOKEN`, `SUPERFRETE_CONTATO`, `SUPERFRETE_AMBIENTE`, `SUPERFRETE_CEP_ORIGEM`, `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_SELLER_ID`, `MERCADO_PAGO_AMBIENTE`). Tokens privados nunca devem ir em variáveis `VITE_*`.
   - Para promover um usuário a administrador, altere a coluna `perfil` para `'admin'` na tabela `public.perfis`.

5. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173`.

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

Projeto desenvolvido para o ateliê **Mimos da Taty**. Todos os direitos reservados ou sob licença interna do projeto.
