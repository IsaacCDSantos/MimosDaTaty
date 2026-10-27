# Pedidos do administrador

## Visualização e dados

A interface é acessível em /previa/admin/pedidos com dados inteiramente fictícios. /admin/pedidos usa a mesma guarda da área administrativa e permanece bloqueada sem autenticação verificada pelo backend. A prévia pública nunca consulta clientes ou pedidos reais.

São 16 pedidos de demonstração com paginação de seis linhas: as seis primeiras reproduzem a referência e os resumos globais são calculados a partir da lista completa (6 novos, 4 em produção, 3 enviados e 3 entregues). Buscar e filtrar afeta somente a listagem; os indicadores continuam representando todos os pedidos. Todas as alterações são temporárias e desaparecem ao sair da página ou recarregar.

## Requisitos implementados na interface

- RF13: número, cliente, data, itens, total e status em tabela, adaptada para cards no celular.
- RF14: indicadores calculados de pedidos novos, em produção e enviados.
- RF15: filtros Todos/Em produção/Enviados/Entregues e busca por nome ou número, ignorando acentos e maiúsculas.
- RF16: detalhes com itens, quantidades, valores, cliente, endereço e forma de pagamento. Valores calculados em centavos para evitar erros de ponto flutuante.
- RF17: observações da cliente disponíveis no detalhe do pedido.
- RF18: avançar ou voltar somente uma etapa entre Novo, Em produção, Enviado e Entregue.
- RF19: código de rastreio obrigatório para marcar como Enviado e editável em pedidos enviados.
- RF20: observação interna separada da mensagem da cliente; não é compartilhada com a vitrine.
- RNF02: abrir Detalhes e usar o botão da próxima etapa atualiza o status; o envio exige primeiro preencher o rastreio.
- RNF03/RNF11: identidade visual existente e layout adaptado a desktop/celular, com diálogo nativo e retorno de foco.

## Limites e integração

A persistência e a autorização de backend ainda não existem. Os botões de atualização atuam apenas no modo demonstracao; fora dele permanecem desabilitados. Não utilizar perfil da query ou armazenamento do navegador como autenticação. Um serviço futuro deverá autenticar o administrador, autorizar cada operação e persistir as atualizações. Os dados privados reais não devem ser fornecidos à rota de prévia.

pedidosModelo.js concentra cálculos, busca, contagens e transições imutáveis. pedidosDemonstracao.js contém somente exemplos. PedidosAdmin recebe a lista pela prop pedidosIniciais; a aplicação real deverá carregar os pedidos autorizados antes de montar a página.

Execute npm test para verificar as regras de valores, busca, datas, transições, rastreio e observações. npm run lint e npm run build verificam sintaxe e compilação.
