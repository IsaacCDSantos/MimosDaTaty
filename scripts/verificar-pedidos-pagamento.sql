-- Executar integralmente como postgres em ambiente autorizado, com ROLLBACK.
-- Requer a migração pedidos_exigir_pagamento_aprovado. Para validar a candidata
-- antes de publicá-la, incluir seu DDL nesta mesma transação antes do primeiro DO.
-- Exige somente o perfil da conta reservada admin@mimosdataty.test; não altera
-- esse perfil, não copia pedidos/clientes reais, não chama checkout nem estoque.
-- UUIDs e números explícitos evitam avançar sequences (que ROLLBACK não reverte).
-- Não usar dentro de outra transação. Se houver erro, ROLLBACK na mesma conexão;
-- nunca substituir o ROLLBACK final por COMMIT.
-- Cobertura: INSERT/UPDATE direto, todos os destinos protegidos, valores financeiros
-- ausentes/desconhecidos, retorno de etapa, edição legada, sincronização financeira
-- pelo trigger real de pagamentos e cancelamento com os grants de service_role.
-- A corrida é reproduzida por interleaving determinístico: lê a versão aprovada,
-- revoga o pagamento e tenta o PATCH com a leitura antiga; não usa duas conexões.
-- Como now() é constante nesta transação, o filtro financeiro é testado mesmo
-- quando a mudança concorrente não pode ser detectada só por atualizado_em.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  v_owner uuid;
  v_pedido constant uuid := '9c7d963b-1111-4000-8000-000000000001';
  v_insercao constant uuid := '9c7d963b-1111-4000-8000-000000000002';
  v_pagamento constant uuid := '9c7d963b-2222-4000-8000-000000000001';
  v_estado text;
  v_destino text;
  v_constraint text;
  v_versao timestamptz;
  v_andamento text;
  v_linhas integer;
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.pedidos'::regclass
      and tgname = 'trg_pedidos_exigir_pagamento_aprovado'
      and tgfoid = to_regprocedure('public.exigir_pagamento_aprovado_no_andamento()')
      and tgtype = 23 and tgenabled in ('O', 'A')
  ) then
    raise exception 'Instale e revise a migração no banco de teste antes da validação.';
  end if;
  -- Qualquer novo trigger pode ter efeitos externos ou consumir sequences: revisar.
  if exists (
    select 1 from pg_trigger
    where tgrelid in ('public.pedidos'::regclass, 'public.pagamentos'::regclass)
      and not tgisinternal
      and tgname not in ('trg_pedidos_exigir_pagamento_aprovado', 'trg_pedidos_datas_status',
                         'trg_pagamentos_atualizado_em', 'trg_pagamentos_sincronizar')
  ) then
    raise exception 'Há triggers novos: revise seus efeitos antes de executar fixtures.';
  end if;
  select p.id into v_owner
  from auth.users u join public.perfis p on p.id = u.id
  where lower(u.email) = 'admin@mimosdataty.test';
  if v_owner is null then raise exception 'Falta o perfil da conta de teste reservada.'; end if;
  if exists (select 1 from public.pedidos where id in (v_pedido, v_insercao)
      or numero_pedido in (920000000001, 920000000002))
     or exists (select 1 from public.pagamentos where id = v_pagamento) then
    raise exception 'Colisão com IDs reservados: nenhuma fixture foi reutilizada.';
  end if;
  perform set_config('mimos.pedidos_pagamento_fixture', v_pedido::text, true);

  insert into public.pedidos (
    id, numero_pedido, cliente_id, status_pedido, status_pagamento, forma_pagamento,
    subtotal_centavos, frete_centavos, total_centavos,
    cliente_nome_snapshot, cliente_email_snapshot, cliente_cpf_snapshot, cliente_telefone_snapshot,
    entrega_destinatario, entrega_cep, entrega_logradouro, entrega_numero,
    entrega_bairro, entrega_cidade, entrega_uf
  ) values (
    v_pedido, 920000000001, v_owner, 'novo', 'pendente', 'pix', 10000, 0, 10000,
    'Fixture Pagamento', 'fixture-pagamento@example.com', '00000000000', '00000000000',
    'Fixture Destinatário', '00000000', 'Rua Fictícia', '1', 'Bairro Fictício', 'Cidade Fictícia', 'SP'
  );

  foreach v_estado in array array['pendente', 'recusado', 'cancelado', 'estornado', null, 'desconhecido'] loop
    foreach v_destino in array array['em_producao', 'enviado', 'entregue'] loop
      begin
        update public.pedidos
        set status_pagamento = v_estado, status_pedido = v_destino, codigo_rastreio = 'FIXTURE-TESTE'
        where id = v_pedido;
        raise exception 'UPDATE sem aprovação passou: %, %', v_estado, v_destino;
      exception when check_violation then
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint is distinct from 'pedidos_andamento_exige_pagamento_aprovado' then
          raise exception 'Outra constraint mascarou o teste: %', v_constraint;
        end if;
      end;
      begin
        -- Todos os outros campos são válidos e fictícios, derivados só da fixture.
        insert into public.pedidos (
          id, numero_pedido, cliente_id, status_pedido, status_pagamento, forma_pagamento,
          subtotal_centavos, frete_centavos, total_centavos,
          cliente_nome_snapshot, cliente_email_snapshot, cliente_cpf_snapshot, cliente_telefone_snapshot,
          entrega_destinatario, entrega_cep, entrega_logradouro, entrega_numero,
          entrega_bairro, entrega_cidade, entrega_uf, codigo_rastreio
        ) select v_insercao, 920000000002, cliente_id, v_destino, v_estado, forma_pagamento,
          subtotal_centavos, frete_centavos, total_centavos,
          cliente_nome_snapshot, cliente_email_snapshot, cliente_cpf_snapshot, cliente_telefone_snapshot,
          entrega_destinatario, entrega_cep, entrega_logradouro, entrega_numero,
          entrega_bairro, entrega_cidade, entrega_uf, 'FIXTURE-TESTE'
        from public.pedidos where id = v_pedido;
        raise exception 'INSERT sem aprovação passou: %, %', v_estado, v_destino;
      exception when check_violation then
        get stacked diagnostics v_constraint = constraint_name;
        if v_constraint is distinct from 'pedidos_andamento_exige_pagamento_aprovado' then
          raise exception 'Outra constraint mascarou o teste de INSERT: %', v_constraint;
        end if;
      end;
    end loop;
  end loop;

  update public.pedidos set status_pagamento = 'aprovado', codigo_rastreio = 'FIXTURE-TESTE' where id = v_pedido;
  foreach v_destino in array array['em_producao', 'enviado', 'entregue', 'enviado', 'em_producao', 'novo'] loop
    update public.pedidos set status_pedido = v_destino where id = v_pedido;
    if not exists (select 1 from public.pedidos where id = v_pedido
        and status_pedido = v_destino and codigo_rastreio = 'FIXTURE-TESTE') then
      raise exception 'Aprovação ou retorno perdeu andamento/rastreio: %', v_destino;
    end if;
  end loop;

  -- Legado é criado somente com a fixture: entra aprovado e depois perde aprovação.
  update public.pedidos set status_pedido = 'enviado' where id = v_pedido;
  foreach v_estado in array array['pendente', 'recusado', 'cancelado', 'estornado'] loop
    update public.pedidos set status_pagamento = v_estado where id = v_pedido;
    update public.pedidos set status_pedido = 'enviado', observacao_interna = 'Fixture editada',
      codigo_rastreio = 'FIXTURE-LEGADO' where id = v_pedido;
    if not exists (select 1 from public.pedidos where id = v_pedido
        and status_pedido = 'enviado' and status_pagamento = v_estado
        and observacao_interna = 'Fixture editada' and codigo_rastreio = 'FIXTURE-LEGADO') then
      raise exception 'Edição legada falhou: %', v_estado;
    end if;
    begin
      update public.pedidos set status_pedido = 'em_producao' where id = v_pedido;
      raise exception 'Retorno a etapa protegida sem aprovação passou.';
    exception when check_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'pedidos_andamento_exige_pagamento_aprovado' then raise; end if;
    end;
  end loop;
  update public.pedidos set status_pedido = 'novo', status_pagamento = 'pendente' where id = v_pedido;

  foreach v_estado in array array['recusado', 'estornado'] loop
    update public.pedidos set status_pagamento = 'aprovado' where id = v_pedido;
    select atualizado_em, status_pedido into v_versao, v_andamento
    from public.pedidos where id = v_pedido;
    -- A outra escrita ocorre entre a leitura da tela e seu PATCH; só na fixture.
    -- Recusa após aprovação é uma simulação defensiva: o sincronizador atual
    -- preserva aprovação ao receber recusa atrasada, mas aceita estorno.
    update public.pedidos set status_pagamento = v_estado where id = v_pedido;
    update public.pedidos set status_pedido = 'em_producao'
    where id = v_pedido and status_pedido = v_andamento
      and atualizado_em = v_versao and status_pagamento = 'aprovado';
    get diagnostics v_linhas = row_count;
    if v_linhas <> 0 or not exists (select 1 from public.pedidos where id = v_pedido
        and status_pedido = 'novo' and status_pagamento = v_estado) then
      raise exception 'PATCH com aprovação obsoleta passou após %.', v_estado;
    end if;
  end loop;
  update public.pedidos set status_pagamento = 'pendente' where id = v_pedido;

  -- Usa o trigger financeiro existente, sem chamar provedor/webhook externo.
  insert into public.pagamentos (id, pedido_id, provedor, metodo, status, valor_centavos)
  values (v_pagamento, v_pedido, 'simulacao', 'pix', 'pendente', 10000);
  foreach v_estado in array array['recusado', 'cancelado', 'aprovado'] loop
    update public.pagamentos set status = v_estado where id = v_pagamento;
    if not exists (select 1 from public.pedidos where id = v_pedido
        and status_pagamento = v_estado and status_pedido = 'novo') then
      raise exception 'Sincronização financeira falhou: %', v_estado;
    end if;
  end loop;
  update public.pedidos set status_pedido = 'enviado' where id = v_pedido;
  select atualizado_em, status_pedido into v_versao, v_andamento
  from public.pedidos where id = v_pedido;
  update public.pagamentos set status = 'estornado' where id = v_pagamento;
  update public.pedidos set status_pedido = 'entregue'
  where id = v_pedido and status_pedido = v_andamento
    and atualizado_em = v_versao and status_pagamento = 'aprovado';
  get diagnostics v_linhas = row_count;
  if v_linhas <> 0 then raise exception 'Entrega obsoleta passou após estorno pelo trigger financeiro.'; end if;
  update public.pedidos set observacao_interna = 'Estorno recebido' where id = v_pedido;
  if not exists (select 1 from public.pedidos where id = v_pedido
      and status_pagamento = 'estornado' and status_pedido = 'enviado') then
    raise exception 'Estorno de pedido em andamento foi bloqueado ou perdeu seu status.';
  end if;
end $$;

-- Confere também os grants restritos reais usados no cancelamento de checkout.
set local role service_role;
do $$
declare v_linhas integer;
begin
  update public.pedidos set status_pedido = 'cancelado', motivo_cancelamento = 'Fixture cancelada'
  where id = current_setting('mimos.pedidos_pagamento_fixture')::uuid;
  get diagnostics v_linhas = row_count;
  if v_linhas <> 1 then raise exception 'Cancelamento via service_role não alterou a fixture.'; end if;
end $$;
reset role;
do $$
begin
  if not exists (select 1 from public.pedidos
      where id = current_setting('mimos.pedidos_pagamento_fixture')::uuid
        and status_pedido = 'cancelado' and status_pagamento = 'estornado'
        and cancelado_em is not null) then
    raise exception 'Cancelamento não foi confirmado com o estado financeiro preservado.';
  end if;
end $$;

select 'ok' as bloqueio_financeiro, 'ok' as andamento_aprovado,
       'ok' as edicao_legada, 'ok' as sincronizacao_pagamento, 'ok' as cancelamento;
rollback;
