# Página inicial do administrador

A interface reproduz a referência do painel da artesã com marca, acesso à vitrine, boas-vindas, resumo de visibilidade do catálogo, atalhos de gestão e destaques com detalhes de cada peça. Reutiliza imagens, logo, bonequinha e fontes existentes. Os estilos usam classes admin-home-* para preservar as telas da loja.

## Visualização

- /previa/admin: prévia pública identificada, com dados de exemplo. Os números 24/22/2 não representam o estoque real. As três peças são demonstrativas e nenhuma operação modifica a loja.
- /admin e subcaminhos: passam pela guarda ExigirAdministrador. A sessão é acompanhada pelo Supabase Auth e o perfil é consultado na tabela `perfis`. Sem usuário autenticado com perfil admin, redirecionam para /login?perfil=admin.

## Comportamentos

Na área autenticada, **Sair da conta** encerra a sessão neste navegador pelo Supabase Auth e retorna à página inicial da loja (`/`), substituindo a entrada atual do histórico. Durante o envio, o botão fica desabilitado; em caso de erro, o painel informa que é necessário tentar novamente. A prévia pública não exibe esse botão e não altera sessões.

A guarda administrativa também retorna a `/` ao receber `SIGNED_OUT`, pois esse evento pode ocorrer antes de a chamada de saída terminar. Acesso direto à área administrativa sem sessão continua direcionando ao login.

Ver vitrine da loja abre o início existente. Ver todas abre o catálogo público existente. Selecionar uma peça abre os detalhes em diálogo nativo com suporte a Escape e retorno do foco ao botão de origem.

Acessar Pedidos e Acessar Catálogo abrem as respectivas telas administrativas no mesmo modo de acesso (prévia ou área protegida). O catálogo permite filtrar categorias e, na prévia, adicionar/editar peças fictícias e alternar sua visibilidade.

## Formulários de peças

As páginas ficam em `paginas/Admin/AdicionarPeca/` e `paginas/Admin/EditarPeca/`, com estilos limitados a cada página.

- `/previa/admin/adicionar-peca` e `/previa/admin/editar-peca`: demonstrações públicas, identificadas na interface. A edição usa uma peça fictícia.
- `/adicionar-peca` e `/editar-peca`: endereços anteriores preservados como demonstrações.
- `/admin/adicionar-peca` e `/admin/editar-peca`: rotas protegidas pela mesma guarda das demais telas administrativas.

Na prévia de catálogo, os formulários compartilham produtos fictícios, validam todos os campos, recebem a peça selecionada por ID e permitem salvar ou excluir temporariamente, com confirmação para exclusão. Catálogo, Voltar e Cancelar abrem o catálogo administrativo; cancelar descarta os rascunhos. Os endereços anteriores continuam sendo prévias isoladas. Consulte CatalogoAdmin/README.md. As operações reais do catálogo usam agora o serviço pecas.js, dentro da guarda administrativa e com autorização pelas políticas do Supabase. Pedidos continuam em fluxo separado.

## Requisitos e próxima integração

RNF03 e RNF11 orientam identidade visual e responsividade. Resumo de peças visíveis/ocultas e atalhos preparam a entrada dos fluxos RF13–RF24; gestão, pedidos e persistência não fazem parte desta tela inicial.

A guarda verifica o usuário com `supabase.auth.getUser()` e consulta seu perfil na tabela `perfis`. Nunca usar query perfil, seleção do login ou metadados editáveis pelo usuário como prova de autorização administrativa. Cada operação administrativa deverá ser autorizada também pela API e pelas políticas de acesso do banco.

InicioAdmin recebe dados por prop. A fixture DADOS_ADMIN_DEMONSTRACAO é injetada somente na rota de prévia. Sem dados, a página mostra indicadores vazios em vez de inventar estoque. Ao conectar serviços reais, fornecer dados autorizados e remover o modo de demonstração.
