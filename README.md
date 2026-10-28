<div align="center">

  <img src="./src/assets/imagens/logo-mimos-da-taty.png" alt="Logo Mimos da Taty" width="180" />

  # 🎀 Sistema Web - Mimos da Taty

  **Plataforma web de apresentação e e-commerce para ateliê de produtos artesanais e enxovais infantis.**

  <p>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
    <a href="https://vite.dev/"><img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
    <a href="https://reactrouter.com/"><img src="https://img.shields.io/badge/React_Router-v7-CA4245?style=for-the-badge&logo=react-router&logoColor=white" alt="React Router" /></a>
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
- [Pré-requisitos](#-pré-requisitos)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Padrões de Desenvolvimento](#-padrões-de-desenvolvimento)
- [Roadmap de Evolução](#-roadmap-de-evolução)
- [Desenvolvedores](#-desenvolvedores)
- [Licença](#-licença)

---

## 📖 Sobre o Projeto

O **Sistema Web Mimos da Taty** é uma aplicação web desenvolvida para modernizar a presença digital e a operação comercial do ateliê **Mimos da Taty**, fundado em 2006 pela artesã Tati. O ateliê é especializado na criação personalizada de **enxovais de bebê de alto padrão**, englobando peças em crochê e bordado como mantas, fraldas de boca e de passeio, toalhas, trocadores, kits de berço e itens decorativos de organização.

A aplicação foi planejada para unir a sensibilidade e o acolhimento do artesanato a uma experiência de navegação contemporânea, ágil e responsiva, permitindo aos clientes:
- Conhecer a essência, história e diferenciais de qualidade do ateliê;
- Visualizar vitrines e catálogos de produtos exclusivos;
- Acessar autenticação com distinção entre clientes e painel administrativo;
- Realizar simulação e fluxo de checkout para aquisição de peças;
- Entrar em contato direto via canais dedicados (WhatsApp e redes sociais).

---

## ✨ Funcionalidades Principais

- 🏠 **Landing Page Completa e Dinâmica**:
  - **Header Inteligente**: Navegação com âncoras suaves e efeito dinâmico baseado na rolagem da página.
  - **Seção Hero**: Apresentação visual de alto impacto com chamada para ação (*CTA*).
  - **Diferenciais & Benefícios**: Destaque para confecção 100% artesanal, segurança na entrega, personalização sob medida e atendimento próximo.
  - **Sobre a Artesã**: Mosaico interativo com a trajetória de dedicação da fundadora desde 2006.
  - **Canal de Contato**: Formulário e integração com canais diretos de atendimento.

- 🔐 **Autenticação Unificada (`/login`)**:
  - Alternância intuitiva de perfil entre **Cliente** e **Administrador** via estado e parâmetros de URL (`?perfil=admin`).
  - Formulário acessível, com alternância de visibilidade de senha e feedback de validação.
  - Link **Criar conta** disponível no perfil Cliente, levando a `/cadastro`.

- 🎀 **Cadastro de Clientes (`/cadastro`)**:
  - Página responsiva em `src/paginas/Cadastro`, com nome, e-mail, senha e confirmação de senha.
  - Validação de campos obrigatórios, senha com pelo menos 8 caracteres e confirmação coincidente.
  - Envio ao Supabase Auth isolado em `src/servicos/cadastro.js`, com feedback de erro e orientação para confirmar o e-mail quando necessário.
  - Utiliza `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local`. O cadastro por e-mail deve estar habilitado no Supabase e a URL de retorno `/login` de cada ambiente deve estar autorizada nas configurações de autenticação.
  - Login por e-mail e senha com verificação do perfil protegido em `public.perfis`, bloqueio de perfil incompatível e mensagens genéricas de credenciais inválidas.
  - Rotas `/admin` verificam a conta no Supabase Auth e o perfil no banco antes de exibir as telas; a sessão é acompanhada ao entrar, sair e atualizar a página.
  - O cabeçalho identifica a conta conectada por foto ou iniciais e oferece Perfil e Meus pedidos (em breve) e Sair (encerra a sessão neste navegador).

- 🔑 **Fluxo de Recuperação de Senha (`/recuperar-senha` e `/confirmacao`)**:
  - Tela dedicada para solicitação de redefinição de acesso por e-mail.
  - Tela de confirmação e orientação com ações rápidas para retornar ao login ou página inicial.

- 🛒 **Tela de Carrinho de Compras (`/carrinho`)**:
  - Implementação fidedigna ao protótipo do Figma com layout acolhedor em tons rosé e pêssego.
  - Listagem dos itens selecionados com fotografias em alta resolução, descrições detalhadas e prazos de entrega.
  - Ajuste interativo de quantidades (+ / -) e remoção de itens em tempo real diretamente no front-end.
  - Painel de resumo lateral com cálculo dinâmico de subtotal, frete estimado e valor total.
  - Navegação integrada com atalhos de retorno ao catálogo e botão direto para o fluxo de checkout (`/checkout`).
  - Tratamento de estado vazio (*empty state*) com opções para voltar à vitrine ou restaurar itens de demonstração.

- 🛍️ **Fluxo de Checkout (`/checkout`)**:
  - Resumo de valores em tempo real: Subtotal, frete estimado, cupons de desconto e total final.
  - Seleção de formas de pagamento (Cartão de Crédito com parcelamento, PIX com aprovação instantânea e Boleto Bancário).
  - Atalho para edição do carrinho e navegação de retorno.

- 🧭 **Roteamento SPA Modularizado**:
  - Separação arquitetural entre **Rotas Públicas** e **Rotas Privadas** (preparado para futura área restrita do cliente e dashboard administrativo).
  - Tratamento de páginas inexistentes com redirecionamento automático (Fallback 404).

---

## 🛠️ Tecnologias Utilizadas

### **Frontend & Interface**
| Tecnologia | Versão | Descrição |
| :--- | :--- | :--- |
| **[React](https://react.dev/)** | `^19.2.8` | Biblioteca principal para criação de interfaces declarativas em componentes reutilizáveis. |
| **[Vite](https://vite.dev/)** | `^8.3.0` | Ferramenta de build e bundling de última geração com inicialização instantânea e *Hot Module Replacement (HMR)*. |
| **[React Router DOM](https://reactrouter.com/)** | `^7.18.4` | Gerenciamento de rotas e navegação client-side com URLs amigáveis. |
| **CSS3 Puro & Modular** | — | Estilização temática sob medida com variáveis de cores pastéis/terrosas, animações e responsividade. |
| **SVG Icons Inline** | — | Ícones vetoriais otimizados integrados aos componentes sem sobrecarga de bibliotecas externas pesadas. |

### **Qualidade de Código & Ferramental**
| Ferramenta | Finalidade |
| :--- | :--- |
| **[ESLint](https://eslint.org/) v10** | Padronização e análise estática do código para prevenção de bugs e boas práticas no ecossistema React. |
| **Git & GitHub** | Controle de versionamento distribuído e colaboração através de branches e Pull Requests. |

---

## 📂 Estrutura do Projeto

A organização do código segue o padrão por responsabilidades e domínios de componentes:

```text
Sistema Web Mimos da Taty/
├── public/                 # Arquivos públicos e estáticos
├── src/
│   ├── assets/             # Recursos visuais da aplicação
│   │   ├── imagens/        # Fotografias dos produtos, banners e logo oficial
│   │   └── videos/         # Mídias e vídeos promocionais
│   ├── componentes/        # Componentes de interface e seções reutilizáveis
│   │   ├── Beneficios/     # Cards de benefícios e diferenciais do ateliê
│   │   ├── Carrinho/       # Tela e componentes do carrinho de compras (fiel ao Figma)
│   │   ├── Checkout/       # Tela e resumo do processo de checkout/pagamento
│   │   ├── ConfirmacaoEnvioEmail/ # Tela de feedback pós-solicitação de e-mail
│   │   ├── Contato/        # Seção e formulário para contato com o ateliê
│   │   ├── Header/         # Cabeçalho global com menu responsivo e navegação
│   │   ├── Hero/           # Banner principal de boas-vindas e CTA
│   │   ├── RecuperacaoSenha/    # Interface do formulário de recuperação de senha
│   │   └── Sobre/          # Mosaico histórico da artesã e do ateliê
│   ├── paginas/            # Páginas e visões completas da aplicação
│   │   ├── Cadastro/        # Cadastro de clientes (JSX e CSS próprios)
│   │   ├── Login/           # Tela de Login com troca de perfil (Cliente / Admin)
│   │   └── Inicio/         # Landing Page consolidando as seções da vitrine
│   ├── rotas/              # Configuração e orquestração do React Router
│   │   ├── rotasPrivadas/  # Configuração isolada para rotas restritas e protegidas
│   │   ├── rotasPublicas/  # Configuração isolada para rotas públicas e abertas
│   │   └── index.jsx       # Ponto central de roteamento com fallback 404
│   ├── App.css             # Estilos globais e resets da aplicação
│   ├── App.jsx             # Componente raiz estruturador
│   └── main.jsx            # Ponto de entrada React montado no DOM
├── .gitignore              # Arquivos e diretórios ignorados pelo Git
├── eslint.config.js        # Configuração das regras do linter ESLint
├── index.html              # Template HTML principal da SPA
├── package.json            # Metadados do projeto, dependências e scripts npm
└── vite.config.js          # Configurações do compilador Vite
```

---

## 🗺️ Mapeamento de Rotas

| Rota | Componente | Acesso | Descrição |
| :--- | :--- | :--- | :--- |
| `/` | `Inicio` | **Público** | Página inicial (Landing page com catálogo, sobre, benefícios e contato). |
| `/login` | `Login` | **Público** | Página de autenticação para clientes e administradores. |
| `/cadastro` | `Cadastro` | **Público** | Criação de conta de cliente pelo Supabase Auth. |
| `/carrinho` | `Carrinho` | **Público** | Visualização do carrinho, controle de itens/quantidades e resumo de compras. |
| `/recuperar-senha` | `RecuperacaoSenha` | **Público** | Formulário para envio de redefinição de senha por e-mail. |
| `/confirmacao` | `ConfirmacaoEnvioEmail` | **Público** | Tela de confirmação e orientações após a solicitação de redefinição. |
| `/checkout` | `Checkout` | **Público** | Revisão de pedido, resumo financeiro e seleção de método de pagamento. |
| `/previa/admin` | `InicioAdmin` | **Público, demonstração** | Prévia do painel com dados fictícios, atalhos e detalhes de peças. |
| `/previa/admin/pedidos` | `PedidosAdmin` | **Público, demonstração** | Busca, filtros, detalhes, rastreio e mudanças temporárias de status/observação em pedidos fictícios. |
| `/admin/pedidos` | `ExigirAdministrador` + `PedidosAdmin` | **Restrito** | Tela reservada a administradores autenticados; backend pendente. |
| `/admin/*` | `ExigirAdministrador` | **Restrito** | Bloqueado sem usuário autenticado com perfil admin; integração com backend pendente. |
| `*` | Redirecionamento | — | Redireciona qualquer rota inválida ou inexistente para `/`. |

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de possuir em seu ambiente de desenvolvimento:
- [Node.js](https://nodejs.org/) versão **18.x** ou superior instalada;
- Gerenciador de pacotes **npm** (incluso com o Node) ou **yarn** / **pnpm**;
- Navegador moderno (como [Brave](https://brave.com/), Chrome, Firefox ou Edge).

---

## 🚀 Como Executar o Projeto

### Configuração da autenticação

Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Reinicie o Vite após alterar o arquivo. Na hospedagem, configure essas variáveis **antes do build**. Sem configuração válida, a vitrine continua acessível e o login/cadastro informam indisponibilidade.

A estrutura de perfis está em `supabase/migrations/202610280001_perfis.sql`. Execute esse SQL no SQL Editor do projeto Supabase ao preparar um ambiente. Ele mantém os perfis existentes e cria automaticamente novos perfis como `cliente`. As contas administrativas devem ser promovidas por uma pessoa autorizada no banco; o cadastro público não concede esse acesso. A migração não é executada automaticamente pelo site.

Habilite e-mail/senha no Supabase Auth e autorize a URL `/login` dos ambientes nas URLs de redirecionamento. A proteção de páginas não substitui as regras RLS das futuras tabelas de pedidos e produtos. As telas administrativas atuais ainda usam prévias e não persistem essas operações.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/IsaacCDSantos/MimosDaTaty.git
   ```

2. **Acesse o diretório do projeto:**
   ```bash
   cd "MimosDaTaty/Sistema Web Mimos da Taty"
   ```

3. **Instale as dependências:**
   ```bash
   npm install
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. **Acesse a aplicação no seu navegador:**
   ```text
   http://localhost:5173
   ```

---

## 📜 Scripts Disponíveis

No arquivo `package.json`, estão configurados os seguintes comandos para o ciclo de desenvolvimento:

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite com suporte a HMR. |
| `npm run build` | Compila os ativos do projeto para produção na pasta `dist/`. |
| `npm run preview` | Executa localmente o build de produção para testes pré-deploy. |
| `npm run lint` | Executa a validação de sintaxe e boas práticas com o ESLint. |

---

## 📐 Padrões de Desenvolvimento

Para manter o histórico e a qualidade de engenharia do repositório, recomenda-se:

- **Conventional Commits**: Seguir o padrão de mensagens semânticas:
  - `feat:` para introdução de novas funcionalidades ou páginas.
  - `fix:` para correções de erros ou inconsistências visuais.
  - `docs:` para atualizações na documentação ou README.
  - `refactor:` para reestruturações de código sem alteração no comportamento.
  - `style:` para ajustes de formatação e folhas de estilo CSS.
- **Isolamento de Branches**: Criação de branches temáticas (`feature/...`, `bugfix/...`) antes de integrar à branch principal através de Pull Requests.

---

## 🔮 Roadmap de Evolução

- [x] Criação da vitrine institucional e seções da Landing Page;
- [x] Arquitetura de roteamento centralizada com suporte a rotas públicas e privadas;
- [x] Tela de autenticação flexível (Cliente e Admin);
- [x] Telas do fluxo de recuperação de senha e confirmação de e-mail;
- [x] Implementação de carrinho de compras (layout fidedigno ao Figma e interatividade front-end);
- [x] Layout e componentes de checkout com resumo de compras e formas de pagamento;
- [x] Página inicial do admin com prévia identificada e dados de exemplo;
- [x] Interface de pedidos admin com filtros, detalhes, rastreio e alterações temporárias na prévia;
- [ ] Integração com backend / API REST para persistência de dados;
- [ ] Integração com gateway de pagamentos real (PIX dinâmico, cartão);
- [ ] Painel Administrativo privado para gerenciamento de pedidos e produtos.

---

## 👥 Desenvolvedores

Projeto desenvolvido com carinho para o ateliê **Mimos da Taty** (artesanato infantil e enxovais personalizados desde 2006).

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/Fernandocarvalh01">
        <img src="https://github.com/Fernandocarvalh01.png" width="90px;" alt="Fernando Carvalho" style="border-radius: 50%;"/><br />
        <sub><b>Fernando Carvalho</b></sub>
      </a>
    </td>
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

- **Fernando Carvalho** — [@Fernandocarvalh01](https://github.com/Fernandocarvalh01)
- **Guilherme Rodrigues** — [@guirodrigues140507-code](https://github.com/guirodrigues140507-code)
- **Isaac Coelho Santos** — [@IsaacCDSantos](https://github.com/IsaacCDSantos)
- **Vinicius Caminha** — [@ViniciusCaminha](https://github.com/ViniciusCaminha)

---

## 📄 Licença

Este projeto é desenvolvido para o ateliê **Mimos da Taty**. Todos os direitos reservados ou sob licença interna do projeto.
