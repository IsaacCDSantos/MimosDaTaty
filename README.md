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
- [Atualizações Recentes e Pendências](#-atualizações-recentes-e-pendências)
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
  - Login por e-mail e senha com verificação do perfil protegido em `public.perfis`, bloqueio de perfil incompatível e mensagens genéricas de credenciais inválidas.
  - Cliente autenticado segue para `/`; administrador autenticado segue para `/admin`. A opção escolhida no formulário precisa corresponder ao perfil armazenado no banco.
  - Rotas `/admin` verificam a conta no Supabase Auth e o perfil no banco antes de exibir as telas; a sessão é acompanhada ao entrar, sair e atualizar a página.
  - O cabeçalho identifica a conta conectada por foto ou iniciais e oferece Perfil, Meus pedidos e Sair (encerra a sessão neste navegador).

- 🎀 **Cadastro de Clientes (`/cadastro`)**:
  - Página responsiva em `src/paginas/Cadastro`, com nome, e-mail, senha e confirmação de senha.
  - Validação de campos obrigatórios, senha com pelo menos 8 caracteres e confirmação coincidente.
  - Envio ao Supabase Auth isolado em `src/servicos/cadastro.js`, com feedback de erro. Quando a API devolve uma sessão, o cliente entra automaticamente e segue para a página inicial da loja.
  - Utiliza `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local`. O cadastro por e-mail deve estar habilitado no Supabase e a URL de retorno `/login` de cada ambiente deve estar autorizada nas configurações de autenticação.
  - A confirmação de e-mail depende da configuração do projeto no Supabase. Quando estiver habilitada, o usuário precisa confirmar o endereço antes de entrar. A conta de teste utilizada neste ambiente foi criada com confirmação por e-mail.
  - A tabela `perfis` e o trigger versionados criam novos perfis como `cliente`; o cadastro público não concede permissões administrativas.

- 🔑 **Fluxo de Recuperação de Senha (`/recuperar-senha`, `/confirmacao` e `/redefinir-senha`)**:
  - Telas responsivas conforme o Figma, com solicitação real do link pelo Supabase Auth e alteração da senha da conta autenticada.
  - O fluxo principal foi testado manualmente com uma conta: recebimento do link, alteração da senha e login com a nova senha. O envio e o reenvio agora usam um serviço compartilhado; o tratamento completo do retorno de recuperação e a validação atual da entrega permanecem pendentes.
  - O e-mail pertence à caixa de entrada externa do usuário; não existe uma página de e-mail dentro da aplicação nem uma transição interna da confirmação para o modelo da mensagem.
  - O reenvio solicita uma mensagem real ao Supabase após 60 segundos, com bloqueio de pedidos simultâneos e tratamento de erros. A entrega depende do serviço de e-mail configurado. `?previa=expirado` exibe apenas um exemplo visual, sem validar o link recebido.
  - O aviso antigo de demonstração foi removido das telas integradas de recuperação.

- 🛒 **Tela de Carrinho de Compras (`/carrinho`)**:
  - Implementação fidedigna ao protótipo do Figma com layout acolhedor em tons rosé e pêssego.
  - Listagem dos itens selecionados com fotografias em alta resolução, descrições detalhadas e prazos de entrega.
  - Ajuste interativo de quantidades (+ / -) e remoção de itens em tempo real diretamente no front-end.
  - Painel de resumo lateral com subtotal real do carrinho; o frete é calculado pelo CEP no checkout.
  - Navegação integrada com atalhos de retorno ao catálogo e botão direto para o fluxo de checkout (`/checkout`).
  - Carrinho compartilhado com a vitrine e o checkout, persistido localmente apenas com dados dos produtos; estado vazio com retorno ao catálogo.

- 🛍️ **Fluxo de Checkout (`/checkout`)**:
  - Resumo em centavos com subtotal dos itens e frete selecionado pela SuperFrete. Não há aplicação de cupons nesta versão.
  - Formas de pagamento mantidas como prévia desabilitada; cálculo de frete não cria pedidos nem processa pagamentos.
  - Atalho para edição do carrinho e navegação de retorno.

- 🧭 **Roteamento SPA Modularizado**:
  - Separação entre **Rotas Públicas** e **Rotas Privadas**, com autenticação e verificação de perfil no acesso administrativo.
  - Prévias públicas do administrador usam dados demonstrativos e ficam separadas das rotas restritas.
  - Tratamento de páginas inexistentes com redirecionamento automático (Fallback 404).

- 🧵 **Área Administrativa**:
  - Painel inicial, tela de pedidos e formulários de adicionar/editar peças com rotas administrativas protegidas.
  - Formulários retornam ao catálogo correspondente ao modo atual: `/admin/catalogo` ou `/previa/admin/catalogo`.
  - Catálogo administrativo com filtros por categoria, situação visível/oculta e prévia com produtos fictícios. Adicionar e editar compartilham as peças enquanto a prévia está aberta; a vitrine pública continua em `/catalogo`.
  - Catálogo real conectado às tabelas categorias/pecas e ao Storage do Supabase. Cadastro, edição, visibilidade e arquivamento são persistentes; a integração de pedidos e checkout continua separada.

---

## 🛠️ Tecnologias Utilizadas

### **Frontend & Interface**
| Tecnologia | Versão | Descrição |
| :--- | :--- | :--- |
| **[React](https://react.dev/)** | `^19.2.8` | Biblioteca principal para criação de interfaces declarativas em componentes reutilizáveis. |
| **[Vite](https://vite.dev/)** | `^8.3.0` | Ferramenta de build e bundling de última geração com inicialização instantânea e *Hot Module Replacement (HMR)*. |
| **[React Router DOM](https://reactrouter.com/)** | `^7.18.4` | Gerenciamento de rotas e navegação client-side com URLs amigáveis. |
| **[Supabase JS](https://supabase.com/docs/reference/javascript/introduction)** | `^2.118.0` | Autenticação, perfis, catálogo persistente e armazenamento das fotos. |
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
│   │   ├── Contato/        # Seção e formulário para contato com o ateliê
│   │   ├── Header/         # Cabeçalho global com menu responsivo e navegação
│   │   ├── Hero/           # Banner principal de boas-vindas e CTA
│   │   └── Sobre/          # Mosaico histórico da artesã e do ateliê
│   ├── paginas/            # Páginas e visões completas da aplicação
│   │   ├── Admin/          # Painel, pedidos e formulários administrativos
│   │   ├── Cadastro/       # Cadastro de clientes (JSX e CSS próprios)
│   │   ├── Carrinho/       # Carrinho de compras
│   │   ├── Catalogo/       # Vitrine pública
│   │   ├── Checkout/       # Interface de checkout
│   │   ├── ConfirmacaoEnvioEmail/ # Interface de confirmação da recuperação
│   │   ├── Inicio/         # Landing page da loja
│   │   ├── Login/          # Login com seleção Cliente / Admin
│   │   ├── RecuperacaoSenha/ # Solicitação do link de recuperação
│   │   └── RedefinirSenha/  # Formulário de nova senha
│   ├── rotas/              # Configuração e orquestração do React Router
│   │   ├── rotasPrivadas/  # Configuração isolada para rotas restritas e protegidas
│   │   ├── rotasPublicas/  # Configuração isolada para rotas públicas e abertas
│   │   └── index.jsx       # Ponto central de roteamento com fallback 404
│   ├── servicos/           # Cliente Supabase, cadastro e consulta da conta/perfil
│   ├── App.css             # Estilos globais e resets da aplicação
│   ├── App.jsx             # Componente raiz estruturador
│   └── main.jsx            # Ponto de entrada React montado no DOM
├── supabase/migrations/    # SQL de perfis, permissões RLS e trigger de cadastro
├── tests/                  # Testes automatizados do modelo de pedidos
├── .env.example            # Modelo das variáveis públicas do Supabase
├── .gitignore              # Ignora .env.local e arquivos gerados
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
| `/catalogo` | `Catalogo` | **Público** | Vitrine de produtos; não é o gerenciamento administrativo. |
| `/meus-pedidos` | `MeusPedidos` | **Exige login** | Histórico da própria conta, filtros por etapa e detalhes de peças, valores e entrega. |
| `/meu-perfil` | `MeuPerfil` | **Exige login** | Dados pessoais da própria conta e cadastro/edição do endereço de entrega no Supabase. |
| `/carrinho` | `Carrinho` | **Público** | Visualização do carrinho, controle de itens/quantidades e resumo de compras. |
| `/recuperar-senha` | `RecuperacaoSenha` | **Público** | Solicita o link de recuperação pelo Supabase Auth. |
| `/confirmacao` | `ConfirmacaoEnvioEmail` | **Público** | Tela de confirmação e orientações após a solicitação de redefinição. |
| `/redefinir-senha` | `RedefinirSenha` | **Rota pública; gravação exige sessão válida** | Valida campos, consulta a conta autenticada e solicita a alteração de senha ao Supabase. O tratamento completo de links inválidos/expirados ainda está pendente. |
| `/checkout` | `Checkout` | **Público** | Revisão de pedido, resumo financeiro e seleção de método de pagamento. |
| `/previa/admin` | `InicioAdmin` | **Público, demonstração** | Prévia do painel com dados fictícios, atalhos e detalhes de peças. |
| `/previa/admin/pedidos` | `PedidosAdmin` | **Público, demonstração** | Busca, filtros, detalhes, rastreio e mudanças temporárias de status/observação em pedidos fictícios. |
| `/previa/admin/adicionar-peca` | `AdminAdicionarPeca` | **Público, demonstração** | Adição temporária de peça fictícia ao catálogo da prévia. |
| `/previa/admin/editar-peca?id=1` | `AdminEditarPeca` | **Público, demonstração** | Edição por ID e exclusão confirmada, apenas na prévia. |
| `/adicionar-peca`, `/editar-peca` | Formulários administrativos em demonstração | **Público, demonstração** | Endereços anteriores preservados sem operações reais. |
| `/admin/adicionar-peca` | `ExigirAdministrador` + `AdminAdicionarPeca` | **Restrito** | Cadastro persistente e upload de foto com conta administradora. |
| `/admin/editar-peca` | `ExigirAdministrador` + `AdminEditarPeca` | **Restrito** | Edição por ID e arquivamento persistentes com conta administradora. |
| `/previa/admin/catalogo` | `CatalogoAdmin` | **Público, demonstração** | Listagem, filtros, visibilidade e navegação com produtos fictícios. |
| `/admin/catalogo` | `ExigirAdministrador` + `CatalogoAdmin` | **Restrito** | Listagem de peças reais, filtros e visibilidade persistente no Supabase. |
| `/admin/pedidos` | `ExigirAdministrador` + `PedidosAdmin` | **Restrito** | Autenticação implementada; persistência de pedidos pendente. |
| `/admin/*` | `ExigirAdministrador` + `InicioAdmin` | **Restrito** | Painel liberado após verificar a sessão e o perfil admin no Supabase. |
| `*` | Redirecionamento | — | Redireciona qualquer rota inválida ou inexistente para `/`. |

---

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de possuir em seu ambiente de desenvolvimento:
- [Node.js](https://nodejs.org/) **22.13+ na série 22 ou 24+**, compatível com as versões atuais de Vite e ESLint utilizadas;
- Gerenciador de pacotes **npm** (incluso com o Node) ou **yarn** / **pnpm**;
- Navegador moderno (como [Brave](https://brave.com/), Chrome, Firefox ou Edge).

---

## 🚀 Como Executar o Projeto

### Configuração da autenticação

Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Reinicie o Vite após alterar o arquivo. Na hospedagem, configure essas variáveis **antes do build**. Sem configuração válida, a vitrine continua acessível e o login/cadastro informam indisponibilidade.

Para a recuperação de senha, autorize em **Authentication → URL Configuration → Redirect URLs** o endereço da tela de redefinição de cada ambiente, por exemplo `http://localhost:5173/redefinir-senha` no desenvolvimento local. O link com `localhost` deve ser aberto no computador que executa o site. Antes de atender clientes, configure um serviço de envio de e-mails adequado; o envio padrão do Supabase possui restrições.

A estrutura de perfis está em `supabase/migrations/202610280001_perfis.sql`. Execute esse SQL no SQL Editor do projeto Supabase ao preparar um ambiente. Ele mantém os perfis existentes e cria automaticamente novos perfis como `cliente`. As contas administrativas devem ser promovidas por uma pessoa autorizada no banco; o cadastro público não concede esse acesso. A migração não é executada automaticamente pelo site.

Para conceder acesso administrativo a outra conta, localize seu ID em **Authentication → Users**, encontre a mesma linha em **Table Editor → perfis** e altere `perfil` de `cliente` para `admin`. A pessoa deve sair e entrar novamente pela opção Admin. Essa permissão vale para o site, não para o painel de administração do Supabase.

O Supabase trata tentativas de cadastro repetido com o mesmo e-mail. Conforme as configurações de confirmação, uma resposta sem sessão pode ocultar a existência de uma conta já cadastrada; a tela "Confira seu e-mail" não comprova criação de outra conta nem entrega de uma mensagem. A [issue #7](https://github.com/IsaacCDSantos/MimosDaTaty/issues/7), sobre esse feedback, está encerrada como concluída no GitHub; seus critérios de aceite permanecem desmarcados na descrição.

Habilite e-mail/senha no Supabase Auth e autorize a URL `/login` dos ambientes nas URLs de redirecionamento. As operações do catálogo usam RLS nas tabelas categorias/pecas e políticas no bucket pecas. Somente administradores gravam; a vitrine consulta peças visíveis e não arquivadas. As rotas /previa/admin continuam usando apenas demonstração em memória. Pedidos e checkout ainda precisam da integração própria.

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/IsaacCDSantos/MimosDaTaty.git
   ```

2. **Acesse o diretório do projeto:**
   ```bash
   cd MimosDaTaty
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
| `npm test` | Executa os testes automatizados com o runner nativo do Node.js. |

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
- [x] Cadastro e login integrados ao Supabase Auth;
- [x] Perfis protegidos, criação automática de clientes e acesso administrativo restrito;
- [x] Identificação da conta no cabeçalho e saída da sessão;
- [x] Interfaces do fluxo de recuperação de senha e confirmação de e-mail;
- [x] Solicitação de link e alteração de senha integradas ao Supabase, com fluxo principal testado manualmente;
- [x] Issue de integração da recuperação de senha encerrada no GitHub ([issue #9](https://github.com/IsaacCDSantos/MimosDaTaty/issues/9));
- [x] Implementação de carrinho de compras (layout fidedigno ao Figma e interatividade front-end);
- [x] Layout e componentes de checkout com resumo de compras e formas de pagamento;
- [x] Página inicial do admin com prévia identificada e dados de exemplo;
- [x] Interface de pedidos admin com filtros, detalhes, rastreio e alterações temporárias na prévia;
- [x] Migração SQL de perfis versionada e configuração por variáveis de ambiente;
- [x] Issue sobre o retorno do cadastro com e-mail existente encerrada no GitHub ([issue #7](https://github.com/IsaacCDSantos/MimosDaTaty/issues/7)); os critérios de aceite continuam desmarcados na issue;
- [x] Tela Meu perfil do cliente, com edição persistente de nome, telefone e endereço de entrega;
- [x] Meus pedidos do cliente, com histórico próprio, filtros, etapas e detalhes conectados ao Supabase ([issue #6](https://github.com/IsaacCDSantos/MimosDaTaty/issues/6));
- [ ] Revisar pendências identificadas no código de recuperação de senha: validação do retorno e de links inválidos/expirados, reenvio e avisos demonstrativos;
- [ ] Revisar o botão da vitrine administrativa ([issue #5](https://github.com/IsaacCDSantos/MimosDaTaty/issues/5)), as prévias públicas administrativas ([issue #8](https://github.com/IsaacCDSantos/MimosDaTaty/issues/8)) e a responsividade em celulares ([issue #10](https://github.com/IsaacCDSantos/MimosDaTaty/issues/10));
- [x] Interface de catálogo administrativo e operações temporárias sobre produtos fictícios;
- [x] Catálogo persistente, fotos no Storage e regras administrativas do Supabase;
- [ ] Persistência de pedidos e checkout;
- [ ] Integração com gateway de pagamentos real (PIX dinâmico, cartão);
- [ ] Conectar as operações de pedidos e checkout ao banco existente.

---

## 📝 Atualizações Recentes e Pendências

- **Autenticação:** Supabase Auth integrado, separação entre cliente e administrador, proteção das rotas e mensagens genéricas para falhas de credenciais/perfil.
- **Sessão do cliente:** avatar com foto ou iniciais e menu com Perfil, Meus pedidos e Sair funcionais. O nome salvo no perfil atualiza as iniciais do cabeçalho.
- **Recuperação de senha:** envio do link e alteração da senha integrados ao Supabase; o fluxo principal foi testado manualmente pelo usuário. Reenvio real, validação específica do retorno e correção do aviso demonstrativo permanecem pendentes.
- **Banco de dados e pagamentos:** o catálogo usa a modelagem existente da loja no Supabase. Pedidos e checkout ainda não estão ligados ao mesmo fluxo persistente; o checkout não processa pagamentos reais.
- **Configuração:** a ausência de configuração válida do Supabase não derruba as páginas públicas; o README e `.env.example` orientam a configuração antes do build na hospedagem.
- **Navegação administrativa:** os atalhos abrem o catálogo e os formulários no mesmo modo de acesso. A prévia compartilha apenas produtos fictícios em memória; o catálogo privado usa o Supabase real.
- **Issue encerrada:** [#7 — Cadastro com e-mail existente aparenta criar uma nova conta](https://github.com/IsaacCDSantos/MimosDaTaty/issues/7). O GitHub a registra como concluída, embora os critérios de aceite permaneçam desmarcados. O relato trata da apresentação do resultado; nos testes relatados não foi constatada duplicação do mesmo e-mail no banco.

---

## 👥 Desenvolvedores

Projeto desenvolvido com carinho para o ateliê **Mimos da Taty** (artesanato infantil e enxovais personalizados desde 2006).

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

Este projeto é desenvolvido para o ateliê **Mimos da Taty**. Todos os direitos reservados ou sob licença interna do projeto.

## Catálogo conectado ao Supabase

Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env.local no desenvolvimento e nas variáveis de ambiente da hospedagem antes do build. O arquivo local não é versionado. O cliente utiliza somente a chave pública; cada gravação é autorizada pela sessão do administrador e pelas políticas do banco.

O contrato segue a estrutura existente da branch BancoDadosMimosDaTaty: categorias(id,nome,ativa,ordem), pecas(categoria_id,nome,descricao,preco_centavos,imagem_capa_url,tipo_disponibilidade,estoque_atual,prazo_producao_dias,visivel,arquivada) e bucket público pecas de 5 MB, com JPEG/PNG/WebP/AVIF. Não há criação ou alteração automática de tabelas pelo frontend. Preços são convertidos para centavos; prazos e estoque são validados sem extrair números de textos ambíguos.

Salvar aguarda a resposta do banco; erros preservam os campos e a foto para nova tentativa. O catálogo atualiza os registros somente depois da confirmação. A exclusão arquiva a peça e a oculta da vitrine, preservando itens e fotos dos pedidos anteriores. Fotos novas só são enviadas ao salvar. Upload sem gravação é removido apenas quando há falha SQL confirmada; em resultado de rede desconhecido a imagem é preservada para não quebrar um registro possivelmente gravado. A troca de foto mantém a imagem anterior porque pedidos podem usá-la.

A vitrine /catalogo usa a mesma fonte quando configurada e consulta somente peças visíveis e não arquivadas. Banco vazio ou erro de conexão não são substituídos por exemplos. Sem configuração, a vitrine preserva a demonstração identificada. O carrinho agora compartilha os itens da vitrine com o checkout e consulta o frete no servidor. Checkout não reserva estoque nem confirma pedidos; os indicadores do início do admin preservam o comportamento anterior.

Verificação local de leitura: node --env-file=.env.local scripts/verificar-conexao-supabase.mjs. Verificação transacional de CRUD/RLS: scripts/verificar-permissoes-catalogo.sql, para execução autorizada no SQL Editor do projeto; termina com ROLLBACK e não deixa registros de teste. npm test cobre validação, erros, upload, filtros e normalização; npm run lint e npm run build verificam o projeto.


## Cálculo de frete — SuperFrete

A vitrine, o carrinho e o checkout compartilham os itens selecionados. O carrinho fica no localStorage somente com IDs, quantidades e dados visuais dos produtos; endereço e cartão não são persistidos. O frete fixo de R$ 25 foi substituído pela cotação em /checkout. O cliente informa o CEP, calcula e escolhe um serviço; a seleção atualiza frete e total. Alterar CEP/itens ou atingir a validade de dez minutos invalida a cotação, inclusive durante consultas em andamento.

A Edge Function calcular-frete permite consultar sem conta ou login. O navegador envia apenas CEP de destino, IDs e quantidades. O servidor consulta preços, disponibilidade e prazo de produção no banco antes de chamar a API; nunca usa o preço informado pelo navegador. O prazo de produção é exibido separado do transporte. A função só consulta valores: não emite etiquetas, cria pedidos ou realiza pagamentos.

### Configuração de teste solicitada

- Origem: Maranguape–CE, CEP 61940-005.
- Embalagem única e fixa para o carrinho inteiro: comprimento 30 cm, largura 20 cm, altura 10 cm, peso 1 kg.
- Serviços solicitados: PAC, SEDEX e Mini Envios (1,2,17). A API retorna apenas opções atendidas e pode incluir serviços habilitados na conta.
- Ambiente padrão: sandbox. A caixa e o CEP são exemplos de teste; conferir a embalagem e origem reais antes de usar preços para envios comerciais. O pacote fixo não aumenta com a quantidade.

### Ativar a conta SuperFrete

Crie uma conta no [sandbox SuperFrete](https://sandbox.superfrete.com/#/integrations), abra Integrações → Desenvolvedores e gere o token de teste. No projeto Supabase, Edge Functions → Secrets, configure:

| Nome | Valor |
| --- | --- |
| SUPERFRETE_TOKEN | Token privado gerado na SuperFrete para o ambiente escolhido |
| SUPERFRETE_CONTATO | E-mail real para contato técnico, usado no User-Agent exigido pela API |
| SUPERFRETE_AMBIENTE | sandbox para testes; production somente com token de produção |
| SUPERFRETE_CEP_ORIGEM | 61940005 neste teste; depois, CEP real da loja |

Nenhum token da SuperFrete deve ser colocado no React, em variáveis VITE_ ou no Git. O exemplo de configuração fica em supabase/functions/.env.example. A função usa verify_jwt = false e consulta o catálogo como visitante, respeitando RLS e os filtros de peças visíveis e não arquivadas. Há limite básico de 15 consultas por IP/minuto por instância, usando x-forwarded-for do proxy e um grupo compartilhado quando ausente; não é um limite global distribuído.

Sem conta/token e contato configurados, a função responde FRETE_NAO_CONFIGURADO (503). Essa resposta não é substituída por preços fictícios. Credenciais, CEPs pessoais e respostas brutas do fornecedor não são registrados nos logs da implementação.

### Verificação e limites

Execute npm test, npm run lint e npm run build. Após publicar a função, node --env-file=.env.local scripts/verificar-frete-supabase.mjs confirma CORS e acesso sem login, com rejeição de uma peça inexistente. Para teste completo: cadastre uma peça visível, adicione na vitrine, abra /checkout sem conta, informe o CEP de destino e clique Calcular frete; depois altere CEP/quantidade e confira a invalidação.

Validação manual em 15/11/2026 no ambiente real: origem 61940-005, destino 20020-050 e pacote fixo de 1 kg, 30 × 20 × 10 cm. A API retornou PAC por R$ 28,22 (7 dias úteis) e SEDEX por R$ 50,34 (3 dias úteis). No checkout, uma peça de R$ 500,00 com PAC selecionado totalizou R$ 528,22. Trocar o CEP retirou imediatamente a cotação anterior. Esses valores registram o teste; o site sempre consulta a API para novas cotações. O checkout mantém pagamento desabilitado. A RPC antiga criar_pedido aceita frete do chamador; esta integração não a utiliza. Antes de integrar cobrança/pedido definitivo, o servidor deverá recalcular ou validar uma cotação armazenada para evitar confiar no valor do navegador.

Referências oficiais: [autenticação SuperFrete](https://superfrete.readme.io/reference/primeiros-passos), [cotação de frete](https://superfrete.readme.io/reference/cotacao-de-frete), [autorização de funções Supabase](https://supabase.com/docs/guides/functions/auth-headers).


## Meu perfil do cliente

A opção Perfil no menu da conta abre `/meu-perfil`. Sem sessão, a tela direciona ao login e retorna ao perfil após a autenticação. O formulário usa os dados reais da conta conectada, sem exemplos ou armazenamento de dados pessoais no navegador.

Nome completo e telefone são atualizados em `public.perfis`; o e-mail vem do Supabase Auth e é somente leitura. Cancelar descarta as alterações ainda não salvas. O endereço tem um formulário independente, com validação de CEP, campos de entrega e UF. A tela carrega o endereço principal; quando não existe principal, usa o mais antigo. A edição preserva o proprietário e a indicação de principal; o primeiro cadastro cria um endereço principal. Não há exclusão ou gerenciamento de múltiplos endereços nesta tela.

O serviço confirma a identidade com `auth.getUser()` antes das operações e exige o mesmo usuário que carregou o formulário. Ele grava somente nome/telefone ou os campos de entrega permitidos. As políticas existentes restringem perfis e endereços ao proprietário; o navegador não pode alterar permissões administrativas. Não foi necessário alterar o esquema nem ampliar permissões no Supabase. O ambiente precisa ter as tabelas `perfis` e `enderecos_cliente`, suas políticas RLS e as variáveis públicas do Supabase já utilizadas pelo projeto.

O sucesso é exibido somente após a confirmação da linha pelo banco. Uma falha de conexão com resultado desconhecido bloqueia novas gravações até recarregar os dados. Salvar endereço é independente do botão Salvar alterações dos dados pessoais. Meus pedidos está disponível em `/meus-pedidos`, com navegação entre as duas páginas da conta.

Validação: 19 testes específicos de perfil/endereço e retorno do login, além da suíte geral (136 testes aprovados em 15/11/2026), lint e build. No navegador, foram conferidos o acesso pelo menu, salvar e recarregar nome/telefone, cadastrar endereço, cancelar rascunhos e os layouts de 810 px e 390 px. Os dados fictícios usados no teste foram removidos ao final e a conta de teste foi restaurada. O arquivo `scripts/verificar-permissoes-perfil.sql` verifica edição própria, isolamento entre contas, bloqueio de alteração de perfil e bloqueio de visitantes em uma transação que termina com ROLLBACK; exige a conta de teste indicada no script e uma segunda conta existente. Não altera o esquema nem deixa dados de teste.


## Meus pedidos do cliente

O menu da conta e a sidebar de Perfil abrem `/meus-pedidos`. A tela exige login e retorna a esse endereço após autenticar. Cabeçalho, rodapé e navegação da conta são compartilhados com Meu perfil. A troca de conta remonta o conteúdo e cancela consultas anteriores.

O serviço confirma a identidade antes e depois da leitura, consulta `pedidos` com `cliente_id` da própria conta e busca os itens somente desses pedidos. Pedidos e itens usam paginação por ID para não perder registros no limite de linhas da API. As consultas selecionam colunas explícitas, sem CPF/e-mail snapshots ou observações internas. Não há escrita, cancelamento, mudança de status ou cobrança na página do cliente.

Os filtros Todos, Pagamento aprovado, Em produção, Enviado e Entregue representam etapas. Pagamento aprovado mostra pedidos novos cujo pagamento já foi confirmado. Cancelados, pagamentos pendentes/recusados/estornados e estados não reconhecidos continuam em Todos, com rótulos próprios. A linha de etapas só confirma pagamento quando `status_pagamento` é aprovado; datas ausentes não são inventadas. A lista pode ser atualizada pelo botão ao lado dos filtros.

Ver detalhes do pedido abre uma janela com todas as peças e personalizações, subtotal/frete/total registrados, pagamento, endereço de entrega do pedido e rastreio quando disponível. Os dados históricos vêm dos snapshots, sem recalcular usando preços do catálogo ou o endereço atual do perfil. Datas usam o fuso America/Sao_Paulo. Escape e os botões de fechar devolvem o foco ao pedido de origem. A tela trata carregamento, falhas, filtro vazio e conta sem pedidos. Não há substituição por pedidos demonstrativos. O checkout mantém suas limitações atuais: esta entrega consulta pedidos existentes, sem implantar a criação ou o pagamento de novos pedidos.

Validação: 161 testes automatizados aprovados, incluindo 22 de consulta/normalização de pedidos do cliente e 3 de retorno do login; lint e build aprovados. O script `scripts/verificar-permissoes-pedidos-cliente.sql` verifica leitura própria, isolamento de pedidos e itens, bloqueio de escrita por clientes e bloqueio de leitura por visitantes. Ele usa fixtures em transação e termina com ROLLBACK. No navegador foram conferidos menu/sidebar, filtros, detalhes, rastreio, Escape/retorno de foco, atualização, estados vazios e layouts de 810 px e 390 px. Os dois pedidos fictícios da conta reservada usados na verificação visual foram removidos junto com seus itens, sem alterar estoque ou avançar a sequência de números de pedido.

Limitação preexistente relativa ao RF20: o papel `authenticated` tem SELECT na tabela `pedidos` inteira. Esta tela não solicita nem exibe `observacao_interna`, mas um cliente pode consultar essa coluna de seus próprios pedidos diretamente pela API. RLS isola linhas, não colunas. A proteção desse campo no banco exige uma alteração coordenada com a leitura administrativa; esta implementação preserva o esquema e as permissões existentes.
