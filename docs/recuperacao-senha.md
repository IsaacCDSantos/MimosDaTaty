# Recuperação de senha: integração parcial com Supabase

As telas aprovadas no Figma receberam integração manual do envio do link e da alteração de senha. O fluxo principal foi testado pelo usuário com uma conta e caixa de entrada reais: recebimento do link, alteração da senha e login com a nova senha. Isso não conclui todos os critérios da Issue #9.

## Revisar as telas

- `/recuperar-senha`: valida o e-mail e solicita o link com `supabase.auth.resetPasswordForEmail`. O retorno aponta para `/redefinir-senha` na origem atual. Há estado de envio, bloqueio do botão e tratamento genérico de falhas; a confirmação só abre após resposta sem erro.
- `/confirmacao`: orientação para abrir a caixa de entrada externa. O botão de reenvio apenas simula a interação após 60 segundos. “Usar outro e-mail” retorna ao formulário.
- `/redefinir-senha`: valida tamanho, letras, números e confirmação. Consulta a conta com `getUser()` e solicita a alteração com `updateUser({ password: senha })`. Só mostra sucesso após resposta sem erro; a verificação de sessão não substitui o tratamento específico do retorno de recuperação. Não encerra a sessão automaticamente.
- `/redefinir-senha?previa=expirado`: exemplo visual de link inválido/expirado. Esse parâmetro é um controle da prévia, não uma validação de segurança.

O parâmetro `?perfil=admin` preserva o retorno ao login administrativo. Ele não concede acesso nem altera o perfil no banco.

## Fronteira entre site e e-mail

O modelo de e-mail do Figma é uma **referência externa**, não uma página, rota, modal ou caixa de entrada do site. O Supabase Auth envia a mensagem; o usuário abre o link no próprio serviço de e-mail e retorna à aplicação na tela de nova senha.

A confirmação não navega para uma caixa de entrada dentro do site. Abrir a rota de nova senha diretamente exibe o formulário, mas não cria uma autorização para alterar a senha: a gravação exige uma sessão válida no Supabase.

## Pendências para a próxima etapa

1. **Validar o retorno de recuperação**: tratar carregamento da sessão, abertura sem link, links inválidos, expirados ou usados e conta já conectada. `?previa=expirado` continua sendo somente uma demonstração.
2. **Reenviar**: integrar a função `reenviar` de `ConfirmacaoEnvioEmail.jsx` ao Supabase, com carregamento, erros e limites de envio. A contagem local não substitui os limites do serviço.
3. **Reconciliar textos visuais**: remover ou atualizar o aviso `senha-demo` em `RecuperacaoLayout`, que ainda afirma que nenhum e-mail é enviado e nenhuma senha é alterada.
4. **Retorno ao login e perfil**: revisar encerramento da sessão após salvar e preservação do retorno Cliente/Admin pelo link de recuperação.
5. **Validar os demais casos**: testar falhas de rede, limites de envio, senhas divergentes, senha igual à atual, retorno inválido e reenvio. Os testes existentes do repositório cobrem o modelo de pedidos, não esta integração de Auth.

## Configuração por ambiente

O cliente existente usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local`, que deve permanecer fora do Git. Reinicie o Vite após alterar essas variáveis.

Autorize a URL de retorno em Authentication → URL Configuration. No teste local foi usado `http://localhost:5173/redefinir-senha`; ajuste à porta real e cadastre o endereço exato de produção na hospedagem. `localhost` precisa ser aberto no computador onde o servidor está rodando.

O envio padrão do Supabase tem restrições e foi usado para o teste. Configure envio SMTP adequado antes de atender clientes. Nenhuma chave, senha ou link de recuperação deve ser registrado nesta documentação.
