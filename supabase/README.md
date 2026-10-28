# Cadastro de clientes sem confirmação de e-mail

Nesta fase do projeto, o cadastro deve permitir criar a conta pelo site e entrar imediatamente na loja.

## Configurar o projeto hospedado

1. No projeto Supabase usado em `.env.local` (ou nas variáveis da hospedagem), abra **Authentication → Sign In / Providers → Email**.
2. Mantenha o provedor Email e a criação de novas contas habilitados. Desative **Confirm email** e salve.
3. Execute `migrations/202610280001_perfis.sql` no SQL Editor se a migração ainda não tiver sido aplicada. Ela cria automaticamente um perfil `cliente` para cada conta nova. Não substitua o trigger por metadados enviados pelo formulário.

O site usa apenas a URL e a chave pública. Ele não pode mudar a configuração de confirmação. Não adicione chaves administrativas ao frontend. A opção no painel vale para o projeto inteiro, incluindo outras versões do site que usem o mesmo Supabase.

Documentação: [configuração de autenticação](https://supabase.com/docs/guides/auth/general-configuration) e [retorno de signUp](https://supabase.com/docs/reference/javascript/auth-signup).

## Comportamento no site

- Com a confirmação desativada, `signUp` retorna usuário e sessão. A página `/cadastro` leva diretamente para `/`, com a conta conectada no cabeçalho.
- O perfil nasce como `cliente` no banco, sem permissão administrativa.
- Se o projeto continuar exigindo confirmação, a API não devolve sessão. O site mantém a orientação de confirmação, sem fingir que o usuário já está conectado.
- Uma conta que já existe não deve ser recriada. Use a opção de login.

## Conferir o fluxo

1. Acesse `/login`, escolha Cliente e clique em Criar conta.
2. Cadastre um e-mail novo, nome e senha de pelo menos 8 caracteres.
3. Confira o retorno para a loja com a conta conectada; atualize a página e confira se continua conectado.
4. Saia e entre novamente como Cliente, usando o mesmo e-mail e senha.
5. Confira que a conta não acessa `/admin`.

No SQL Editor, substitua o e-mail abaixo pelo utilizado no teste:

```sql
select
  u.email,
  u.email_confirmed_at,
  p.perfil
from auth.users u
left join public.perfis p on p.id = u.id
where u.email = 'cliente@exemplo.com';
```

Com **Confirm email** desativado, o Supabase marca os novos e-mails como confirmados automaticamente. O perfil esperado é `cliente`. A configuração não é um comando para confirmar em massa contas antigas; trate cadastros anteriores separadamente caso o login continue bloqueado.
