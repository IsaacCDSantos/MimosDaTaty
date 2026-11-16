-- Validação transacional de acesso do cliente a pedidos e itens.
-- Executar o arquivo inteiro, como postgres, somente no projeto de teste autorizado.
-- Não executar em uma conexão que já tenha outra transação aberta.
-- Pré-requisitos: conta reservada admin@mimosdataty.test, outra conta com perfil
-- e pelo menos uma peça existente. Nenhum dado pessoal real é copiado/exibido.
-- Todas as fixtures usam UUID e numero_pedido explícitos; a sequence não avança.
-- Não chama criar_pedido, não reserva estoque e não altera policies/grants/schema.
-- Esta verificação cobre linhas (RLS), não isolamento de colunas como observacao_interna.
-- Limitação preexistente: authenticated tem SELECT na tabela pedidos inteira; por acesso
-- direto, o cliente pode consultar observacao_interna de seu próprio pedido.
-- A whitelist do serviço omite esse campo da tela, mas não é proteção de coluna no banco.
-- Um erro aborta a transação: não faça COMMIT; execute ROLLBACK na mesma conexão.
-- Referência: https://supabase.com/docs/guides/local-development/testing/overview

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
set local row_security = on;

do $$
declare
  v_owner uuid;
  v_outro uuid;
  v_peca uuid;
  v_linhas integer;
begin
  -- Falha antes de inserir se o esquema ganhar gatilhos de INSERT/DELETE/TRUNCATE.
  -- Na revisão atual, pedidos tem somente BEFORE UPDATE de datas e itens não tem trigger.
  if exists (
    select 1 from pg_trigger
    where tgrelid in ('public.pedidos'::regclass, 'public.itens_pedido'::regclass)
      and not tgisinternal and (tgtype::integer & (4 | 8 | 32)) <> 0
  ) then
    raise exception 'Revise os novos gatilhos antes de executar as fixtures de pedidos.';
  end if;
  if exists (
    select 1 from pg_class
    where oid in ('public.pedidos'::regclass, 'public.itens_pedido'::regclass)
      and not relrowsecurity
  ) then
    raise exception 'RLS precisa estar habilitado em pedidos e itens_pedido.';
  end if;

  select p.id into v_owner
  from auth.users u join public.perfis p on p.id = u.id
  where lower(u.email) = 'admin@mimosdataty.test';
  if v_owner is null then
    raise exception 'A conta reservada admin@mimosdataty.test e seu perfil precisam existir.';
  end if;
  select id into v_outro from public.perfis where id <> v_owner order by id limit 1;
  if v_outro is null then
    raise exception 'A verificação exige uma segunda conta existente com perfil.';
  end if;
  select id into v_peca from public.pecas order by id limit 1;
  if v_peca is null then
    raise exception 'A verificação exige uma peça existente para satisfazer a chave estrangeira.';
  end if;

  perform set_config('mimos.pedidos_rls_owner', v_owner::text, true);
  perform set_config('mimos.pedidos_rls_outro', v_outro::text, true);
  perform set_config('mimos.pedidos_rls_peca', v_peca::text, true);
  perform set_config('mimos.pedidos_rls_pedido_owner', 'ea973b12-1111-4000-8000-000000000001', true);
  perform set_config('mimos.pedidos_rls_pedido_outro', 'ea973b12-1111-4000-8000-000000000002', true);
  perform set_config('mimos.pedidos_rls_item_owner', 'ea973b12-2222-4000-8000-000000000001', true);
  perform set_config('mimos.pedidos_rls_item_outro', 'ea973b12-2222-4000-8000-000000000002', true);

  -- Não reaproveitar/excluir registros que por acaso tenham estes IDs/números.
  if exists (
    select 1 from public.pedidos
    where id in ('ea973b12-1111-4000-8000-000000000001', 'ea973b12-1111-4000-8000-000000000002', 'ea973b12-1111-4000-8000-000000000003')
       or numero_pedido in (910000000001, 910000000002, 910000000003)
  ) or exists (
    select 1 from public.itens_pedido
    where id in ('ea973b12-2222-4000-8000-000000000001', 'ea973b12-2222-4000-8000-000000000002', 'ea973b12-2222-4000-8000-000000000003')
  ) then
    raise exception 'Uma fixture reservada já existe. Revise os IDs antes de continuar.';
  end if;

  -- A mudança de perfil é local à transação e será revertida junto com as fixtures.
  update public.perfis set perfil = 'cliente' where id = v_owner;
  get diagnostics v_linhas = row_count;
  if v_linhas <> 1 then raise exception 'Não foi possível preparar a conta reservada.'; end if;

  insert into public.pedidos (
    id, numero_pedido, cliente_id, status_pedido, status_pagamento, forma_pagamento,
    subtotal_centavos, frete_centavos, total_centavos,
    cliente_nome_snapshot, cliente_email_snapshot, cliente_cpf_snapshot, cliente_telefone_snapshot,
    entrega_destinatario, entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro,
    entrega_cidade, entrega_uf, observacao_cliente
  ) values
    (current_setting('mimos.pedidos_rls_pedido_owner')::uuid, 910000000001, v_owner,
     'novo', 'pendente', 'pix', 10000, 2500, 12500,
     'Conta Fictícia RLS', 'pedido-ficticio@example.com', '00000000000', '00000000000',
     'Destinatário Fictício', '00000000', 'Rua Exemplo', '10', 'Bairro Exemplo',
     'Cidade Exemplo', 'CE', 'Fixture fictícia, revertida ao final.'),
    (current_setting('mimos.pedidos_rls_pedido_outro')::uuid, 910000000002, v_outro,
     'novo', 'pendente', 'pix', 10000, 2500, 12500,
     'Outra Conta Fictícia RLS', 'outro-pedido-ficticio@example.com', '00000000000', '00000000000',
     'Outro Destinatário Fictício', '00000000', 'Rua Exemplo', '20', 'Bairro Exemplo',
     'Cidade Exemplo', 'CE', 'Fixture de isolamento, revertida ao final.');

  insert into public.itens_pedido (
    id, pedido_id, peca_id, nome_peca_snapshot, imagem_url_snapshot,
    preco_unitario_centavos, quantidade, prazo_producao_dias_snapshot
  ) values
    (current_setting('mimos.pedidos_rls_item_owner')::uuid,
     current_setting('mimos.pedidos_rls_pedido_owner')::uuid, v_peca,
     'Peça Fictícia RLS', 'https://example.com/peca-ficticia.png', 10000, 1, 7),
    (current_setting('mimos.pedidos_rls_item_outro')::uuid,
     current_setting('mimos.pedidos_rls_pedido_outro')::uuid, v_peca,
     'Outra Peça Fictícia RLS', 'https://example.com/peca-ficticia.png', 10000, 1, 7);

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);
end $$;

set local role authenticated;
do $$
declare v_linhas integer;
begin
  if current_user <> 'authenticated'
     or auth.uid() is distinct from current_setting('mimos.pedidos_rls_owner')::uuid
     or public.eh_admin() is distinct from false then
    raise exception 'A sessão simulada precisa ser um cliente autenticado sem acesso admin.';
  end if;

  select count(*) into v_linhas from public.pedidos
  where id = current_setting('mimos.pedidos_rls_pedido_owner')::uuid;
  if v_linhas <> 1 then raise exception 'Cliente não conseguiu ler seu próprio pedido.'; end if;
  select count(*) into v_linhas from public.pedidos
  where id = current_setting('mimos.pedidos_rls_pedido_outro')::uuid;
  if v_linhas <> 0 then raise exception 'Cliente conseguiu ler pedido de outra conta.'; end if;
  select count(*) into v_linhas from public.itens_pedido
  where id = current_setting('mimos.pedidos_rls_item_owner')::uuid;
  if v_linhas <> 1 then raise exception 'Cliente não conseguiu ler o item de seu pedido.'; end if;
  select count(*) into v_linhas from public.itens_pedido
  where id = current_setting('mimos.pedidos_rls_item_outro')::uuid;
  if v_linhas <> 0 then raise exception 'Cliente conseguiu ler item de outra conta.'; end if;

  -- Zero linhas ou SQLSTATE 42501 são resultados válidos para uma escrita bloqueada.
  begin
    update public.pedidos set status_pedido = 'em_producao'
    where id in (current_setting('mimos.pedidos_rls_pedido_owner')::uuid, current_setting('mimos.pedidos_rls_pedido_outro')::uuid);
    get diagnostics v_linhas = row_count;
    if v_linhas <> 0 then raise exception 'Cliente conseguiu atualizar um pedido.'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    update public.itens_pedido set quantidade = 2
    where id in (current_setting('mimos.pedidos_rls_item_owner')::uuid, current_setting('mimos.pedidos_rls_item_outro')::uuid);
    get diagnostics v_linhas = row_count;
    if v_linhas <> 0 then raise exception 'Cliente conseguiu alterar um item do pedido.'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    -- Todos os dados são válidos: uma constraint não deve mascarar a ausência de proteção.
    insert into public.pedidos (
      id, numero_pedido, cliente_id, forma_pagamento, subtotal_centavos, frete_centavos, total_centavos,
      cliente_nome_snapshot, cliente_email_snapshot, cliente_cpf_snapshot, cliente_telefone_snapshot,
      entrega_destinatario, entrega_cep, entrega_logradouro, entrega_numero, entrega_bairro, entrega_cidade, entrega_uf
    ) values (
      'ea973b12-1111-4000-8000-000000000003', 910000000003,
      current_setting('mimos.pedidos_rls_owner')::uuid, 'pix', 10000, 2500, 12500,
      'Conta Fictícia RLS', 'pedido-ficticio@example.com', '00000000000', '00000000000',
      'Destinatário Fictício', '00000000', 'Rua Exemplo', '30', 'Bairro Exemplo', 'Cidade Exemplo', 'CE'
    );
    raise exception 'Cliente conseguiu inserir diretamente um pedido.';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.itens_pedido (
      id, pedido_id, peca_id, nome_peca_snapshot, imagem_url_snapshot, preco_unitario_centavos, quantidade
    ) values (
      'ea973b12-2222-4000-8000-000000000003', current_setting('mimos.pedidos_rls_pedido_owner')::uuid,
      current_setting('mimos.pedidos_rls_peca')::uuid, 'Peça Fictícia RLS', 'https://example.com/peca-ficticia.png', 10000, 1
    );
    raise exception 'Cliente conseguiu inserir diretamente um item de pedido.';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.itens_pedido
    where id in (current_setting('mimos.pedidos_rls_item_owner')::uuid, current_setting('mimos.pedidos_rls_item_outro')::uuid);
    get diagnostics v_linhas = row_count;
    if v_linhas <> 0 then raise exception 'Cliente conseguiu excluir um item de pedido.'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.pedidos
    where id in (current_setting('mimos.pedidos_rls_pedido_owner')::uuid, current_setting('mimos.pedidos_rls_pedido_outro')::uuid);
    get diagnostics v_linhas = row_count;
    if v_linhas <> 0 then raise exception 'Cliente conseguiu excluir um pedido.'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
begin
  -- Limpar também o sub: o visitante não deve herdar a identidade do teste anterior.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
set local role anon;
do $$
declare v_linhas integer;
begin
  if current_user <> 'anon' or auth.uid() is not null then
    raise exception 'A sessão simulada de visitante não foi isolada.';
  end if;
  begin
    select count(*) into v_linhas from public.pedidos
    where id in (current_setting('mimos.pedidos_rls_pedido_owner')::uuid, current_setting('mimos.pedidos_rls_pedido_outro')::uuid);
    if v_linhas <> 0 then raise exception 'Visitante conseguiu ler pedidos.'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    select count(*) into v_linhas from public.itens_pedido
    where id in (current_setting('mimos.pedidos_rls_item_owner')::uuid, current_setting('mimos.pedidos_rls_item_outro')::uuid);
    if v_linhas <> 0 then raise exception 'Visitante conseguiu ler itens de pedidos.'; end if;
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
do $$
declare v_linhas integer;
begin
  -- Conferência privilegiada limitada às fixtures: nenhuma escrita negativa pode ter passado.
  select count(*) into v_linhas from public.pedidos
  where id in (current_setting('mimos.pedidos_rls_pedido_owner')::uuid, current_setting('mimos.pedidos_rls_pedido_outro')::uuid)
    and status_pedido = 'novo' and subtotal_centavos = 10000 and frete_centavos = 2500 and total_centavos = 12500;
  if v_linhas <> 2 then raise exception 'Uma fixture de pedido sofreu uma escrita indevida.'; end if;
  select count(*) into v_linhas from public.itens_pedido
  where id in (current_setting('mimos.pedidos_rls_item_owner')::uuid, current_setting('mimos.pedidos_rls_item_outro')::uuid)
    and quantidade = 1 and preco_unitario_centavos = 10000;
  if v_linhas <> 2 then raise exception 'Uma fixture de item sofreu uma escrita indevida.'; end if;
end $$;

-- Somente alcançado se todas as verificações anteriores passaram.
select 'ok' as pedido_proprio, 'ok' as isolamento_entre_contas,
       'ok' as itens_do_proprio_pedido, 'ok' as bloqueio_de_escrita_cliente,
       'ok' as bloqueio_de_leitura_visitante;
rollback;


