# Página inicial do administrador

A interface reproduz a referência do painel da artesã com marca, acesso à vitrine, boas-vindas, resumo de visibilidade do catálogo, atalhos de gestão e destaques com detalhes de cada peça. Reutiliza imagens, logo, bonequinha e fontes existentes. Os estilos usam classes admin-home-* para preservar as telas da loja.

## Visualização

- /previa/admin: prévia pública identificada, com dados de exemplo. Os números 24/22/2 não representam o estoque real. As três peças são demonstrativas e nenhuma operação modifica a loja.
- /admin e subcaminhos: passam pela guarda ExigirAdministrador. Sem usuário autenticado com perfil admin, redirecionam para /login?perfil=admin. Como não existe backend de autenticação no projeto, essas rotas permanecem fechadas.

## Comportamentos

Ver vitrine da loja abre o início existente. Ver todas abre o catálogo público existente. Selecionar uma peça abre os detalhes em diálogo nativo com suporte a Escape e retorno do foco ao botão de origem.

Acessar Catálogo/Pedidos mostra que o gerenciamento ainda está indisponível. Não navega para páginas inexistentes nem simula alterações. No aviso do catálogo é possível abrir a vitrine pública.

## Requisitos e próxima integração

RNF03 e RNF11 orientam identidade visual e responsividade. Resumo de peças visíveis/ocultas e atalhos preparam a entrada dos fluxos RF13–RF24; gestão, pedidos e persistência não fazem parte desta tela inicial.

A guarda prepara a navegação frontend para RF25/RNF08, mas não implementa autenticação ou autorização de backend. Sua prop usuario deve ser fornecida somente após autenticação verificada por serviço confiável. Nunca usar query perfil, seleção do login ou armazenamento local como prova de autenticação. Cada operação administrativa deverá ser autorizada também pela API.

InicioAdmin recebe dados por prop. A fixture DADOS_ADMIN_DEMONSTRACAO é injetada somente na rota de prévia. Sem dados, a página mostra indicadores vazios em vez de inventar estoque. Ao conectar serviços reais, fornecer dados autorizados e remover o modo de demonstração.
