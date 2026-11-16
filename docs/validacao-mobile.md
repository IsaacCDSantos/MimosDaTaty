# Validação de responsividade — issue #10

A revisão foi feita no Chrome com larguras de viewport de 360, 375, 390 e 430 px, em uma versão que já contém Perfil, Meus pedidos e os ajustes anteriores do cabeçalho administrativo.

## Mudanças

- Cabeçalho móvel com altura determinada pelo conteúdo; navegação em quatro colunas, sem sobreposição. A rolagem para Sobre/Contato usa a altura real do cabeçalho no celular.
- Menu da conta posicionado dentro da viewport, atualizado ao redimensionar ou rolar, com altura limitada e rolagem própria quando necessário.
- Catálogo, carrinho e checkout com blocos empilhados, espaços menores e quebra de textos e valores.
- Login/cadastro com arte compacta e formulários legíveis; recuperação sem altura fixa nem rolagem interna do card.
- Perfil, histórico, formulários e telas administrativas com campos de 16 px, ações com área de toque de pelo menos 44 px e diálogos ajustados à altura disponível.
- Regras e aparência de desktop preservadas; as alterações CSS ficam em media queries abaixo de 1024 px.

## Matriz de telas

As 80 combinações abaixo passaram na conferência geométrica dos elementos visíveis: sem conteúdo fora da largura útil, sem estouro horizontal da página, sem controles ativos menores que 44 px e sem campos ativos com texto abaixo de 16 px. Elementos decorativos, conteúdo recortado para leitores de tela e controles desabilitados foram desconsiderados como alvos de toque. Radios de frete usam a área do label inteiro. A largura útil pode ser menor que a viewport no Chrome do Windows por causa da barra de rolagem.

| Endereço | 360 px | 375 px | 390 px | 430 px |
| --- | --- | --- | --- | --- |
| `/` | OK | OK | OK | OK |
| `/catalogo` | OK | OK | OK | OK |
| `/carrinho` | OK | OK | OK | OK |
| `/checkout` | OK | OK | OK | OK |
| `/login` | OK | OK | OK | OK |
| `/login?perfil=admin` | OK | OK | OK | OK |
| `/cadastro` | OK | OK | OK | OK |
| `/recuperar-senha` | OK | OK | OK | OK |
| `/confirmacao` | OK | OK | OK | OK |
| `/redefinir-senha` | OK | OK | OK | OK |
| `/meu-perfil` | OK | OK | OK | OK |
| `/meus-pedidos` | OK | OK | OK | OK |
| `/admin` | OK | OK | OK | OK |
| `/admin/catalogo` | OK | OK | OK | OK |
| `/admin/adicionar-peca` | OK | OK | OK | OK |
| `/admin/pedidos` | OK | OK | OK | OK |
| `/adicionar-peca` | OK | OK | OK | OK |
| `/editar-peca` | OK | OK | OK | OK |
| `/previa/admin/pedidos` | OK | OK | OK | OK |
| `/previa/admin/editar-peca?id=1` | OK | OK | OK | OK |

## Conferências adicionais

- Menu da conta aberto em Perfil nas quatro larguras: inteiramente dentro da viewport. Menu na home conferido em 360 px, com fechamento por Escape.
- Navegação Sobre nós: cabeçalho permaneceu no topo e a seção chegou abaixo dele, sem ocultar o título.
- Diálogo de endereço em 390 × 500 px: altura de 468 px, com conteúdo rolável e Escape devolvendo o foco. Nenhum endereço foi salvo.
- Detalhes de pedidos administrativos de demonstração em 390 × 500 px: altura de 476 px, com rolagem interna, campos de 16 px e botões de 44 px.
- Confirmação de exclusão da demonstração: integralmente visível em 390 × 500 px; encerrada por Não, manter peça. Nenhuma peça foi removida.
- Catálogo com peças reais, carrinho com item já existente e checkout foram conferidos visualmente. Não houve mudança de quantidade, compra, cálculo de frete, gravação de perfil ou operação no banco.
- Perfil/Meus pedidos foram conferidos com a conta reservada; o histórico estava vazio. A lista e os detalhes administrativos usaram também as prévias identificadas com pedidos fictícios.

## Desktop e verificações do projeto

Em 1024 e 1440 px, a home manteve cabeçalho fixo de 153 px; catálogo manteve cards em linha; checkout manteve colunas e resumo de 320 px; Perfil manteve duas colunas. O menu da conta no desktop manteve posição absoluta, largura de 280 px e alinhamento ao avatar.

Uma comparação da árvore CSS antes/depois, desconsiderando somente media queries abaixo de 1024 px e comentários, confirmou as regras de desktop iguais nos 22 arquivos CSS modificados. Base da comparação: commit c1fd7a5.

- npm run lint: aprovado.
- npm test: 161 testes aprovados.
- npm run build: aprovado. O aviso já existente sobre tamanho do bundle permanece.

## Como repetir

Inicie o projeto com suas variáveis públicas do Supabase e abra as rotas da tabela. Use uma viewport de cada largura com altura de aproximadamente 844 px. Confira o menu fechado e aberto, as âncoras da home e a rolagem dos diálogos em uma altura menor (500 px). As prévias administrativas usam demonstração em memória; não confirme alterações em peças ou pedidos reais durante essa revisão. Depois compare as mesmas telas em 1024 e 1440 px.
