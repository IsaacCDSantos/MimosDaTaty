-- Não aplicar automaticamente. Mantém dados legados e pagamentos sandbox.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create function public.referencias_pedido_validas(p_refs jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_ref jsonb; v_caminhos text[] := '{}';
begin
  if p_refs is null or jsonb_typeof(p_refs) <> 'array' then return false; end if;
  if jsonb_array_length(p_refs) > 6 then return false; end if;
  for v_ref in select value from jsonb_array_elements(p_refs) loop
    if jsonb_typeof(v_ref) <> 'object' then return false; end if;
    if v_ref - 'caminho' - 'nome' <> '{}'::jsonb
       or jsonb_typeof(v_ref->'caminho') is distinct from 'string'
       or jsonb_typeof(v_ref->'nome') is distinct from 'string' then return false; end if;
    if (v_ref->>'caminho') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}\.(jpg|png|webp)$'
       or char_length(v_ref->>'nome') not between 1 and 120
       or btrim(v_ref->>'nome') = ''
       or (v_ref->>'caminho') = any(v_caminhos) then return false; end if;
    v_caminhos := array_append(v_caminhos, v_ref->>'caminho');
  end loop;
  return true;
end;
$$;
revoke all on function public.referencias_pedido_validas(jsonb) from public, anon;
grant execute on function public.referencias_pedido_validas(jsonb) to authenticated, service_role;

alter table public.itens_pedido add column referencias jsonb not null default '[]'::jsonb;
alter table public.itens_pedido add constraint itens_pedido_referencias_validas
  check (public.referencias_pedido_validas(referencias));
-- Containment usado na política DELETE, incluindo pedidos cancelados.
create index itens_pedido_referencias_gin on public.itens_pedido using gin (referencias jsonb_path_ops);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('referencias-pedidos','referencias-pedidos',false,350000,array['image/jpeg','image/png','image/webp']);

-- A consulta roda com RLS do proprietário. O lock também é tomado na preparação:
-- impede que a limpeza simultânea remova um objeto entre validação e snapshot.
-- VOLATILE é intencional: o SELECT após aguardar o lock usa um snapshot novo.
create function public.pode_remover_referencia_pedido(p_caminho text)
returns boolean language plpgsql volatile security invoker set search_path = '' as $$
begin
  if auth.uid() is null or split_part(p_caminho,'/',1) <> auth.uid()::text then return false; end if;
  -- A limpeza usa snapshot novo depois do lock; outros níveis não podem garantir isso.
  if current_setting('transaction_isolation') <> 'read committed' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('referencia-pedido:' || p_caminho, 0));
  return not exists (select 1 from public.itens_pedido
    where referencias @> jsonb_build_array(jsonb_build_object('caminho',p_caminho)));
end;
$$;
revoke all on function public.pode_remover_referencia_pedido(text) from public, anon;
grant execute on function public.pode_remover_referencia_pedido(text) to authenticated;

create policy "Cliente envia referencias proprias" on storage.objects for insert to authenticated
with check (
  bucket_id='referencias-pedidos'
  and owner_id=(select auth.uid()::text)
  and split_part(name,'/',1)=(select auth.uid()::text)
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}\.(jpg|png|webp)$'
);
create policy "Cliente ou admin consulta referencias" on storage.objects for select to authenticated
using (bucket_id='referencias-pedidos' and
  ((owner_id=(select auth.uid()::text) and split_part(name,'/',1)=(select auth.uid()::text)) or (select public.eh_admin())));
-- Nenhuma policy UPDATE: uploads nunca sobrescrevem referências.
create policy "Cliente remove referencia sem pedido" on storage.objects for delete to authenticated
using (bucket_id='referencias-pedidos' and owner_id=(select auth.uid()::text)
  and split_part(name,'/',1)=(select auth.uid()::text)
  and public.pode_remover_referencia_pedido(name));

-- Em produção este grant já existe; explicita a dependência de leitura do RPC.
grant select on storage.objects to service_role;

create or replace function public.preparar_checkout(p_usuario uuid, p_email text, p_dados jsonb, p_frete jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_s public.checkout_sessoes;
  v_peca public.pecas;
  v_item jsonb;
  v_itens jsonb := '[]'::jsonb;
  v_subtotal bigint := 0;
  v_reservado bigint;
  v_pedido public.pedidos;
  v_id uuid := (p_dados->>'chave')::uuid;
  v_ref jsonb;
  v_obj storage.objects;
  v_caminho text;
  v_vistos text[] := '{}';
  v_end jsonb := p_dados->'endereco';
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_usuario::text, 0));
  select * into v_s from public.checkout_sessoes where id = v_id;
  if found then
    if v_s.cliente_id <> p_usuario or v_s.requisicao <> p_dados then raise exception 'TENTATIVA_DIFERENTE'; end if;
    return to_jsonb(v_s);
  end if;
  -- Uma nova aba com o mesmo pedido recupera a tentativa ativa em vez de cobrar duas vezes.
  select * into v_s from public.checkout_sessoes where cliente_id=p_usuario and requisicao-'chave'=p_dados-'chave' and (estado in ('processando','pendente') or (estado='preparado' and expira_em>now())) order by criado_em desc limit 1;
  if found then return to_jsonb(v_s); end if;
  if (select count(*) from public.checkout_sessoes where cliente_id = p_usuario and (estado in ('processando','pendente') or (estado='preparado' and expira_em>now()))) >= 3 then raise exception 'LIMITE_TENTATIVAS'; end if;
  -- Revalidar os metadados sem depender do frontend/Edge.
  if p_usuario is null or jsonb_typeof(p_dados->'itens') is distinct from 'array' then raise exception 'ITENS_INVALIDOS'; end if;
  if jsonb_array_length(p_dados->'itens') not between 1 and 30 then raise exception 'ITENS_INVALIDOS'; end if;
  for v_item in select value from jsonb_array_elements(p_dados->'itens') loop
    if jsonb_typeof(v_item) <> 'object'
       or jsonb_typeof(v_item->'pecaId') is distinct from 'string'
       or (v_item->>'pecaId') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or jsonb_typeof(v_item->'quantidade') is distinct from 'number'
       or (v_item->>'quantidade') !~ '^([1-9]|[1-4][0-9]|50)$' then raise exception 'ITENS_INVALIDOS'; end if;
    if (v_item->>'pecaId') = any(v_vistos) then raise exception 'ITEM_DUPLICADO'; end if;
    v_vistos := array_append(v_vistos,v_item->>'pecaId');
    if v_item ? 'personalizacao' then
      if jsonb_typeof(v_item->'personalizacao') is distinct from 'string'
         or char_length(v_item->>'personalizacao') > 1000 then raise exception 'PERSONALIZACAO_INVALIDA'; end if;
    end if;
    if not public.referencias_pedido_validas(coalesce(v_item->'referencias','[]'::jsonb)) then raise exception 'REFERENCIAS_INVALIDAS'; end if;
    for v_ref in select value from jsonb_array_elements(coalesce(v_item->'referencias','[]'::jsonb)) loop
      if split_part(v_ref->>'caminho','/',1) <> p_usuario::text
         or split_part(v_ref->>'caminho','/',2) <> v_id::text
         or split_part(v_ref->>'caminho','/',3) <> v_item->>'pecaId' then raise exception 'REFERENCIAS_INVALIDAS'; end if;
    end loop;
  end loop;
  -- A ordenação dos bloqueios impede corridas entre compras concorrentes da mesma peça.
  perform id from public.pecas where id in (select (x->>'pecaId')::uuid from jsonb_array_elements(p_dados->'itens') x) order by id for update;
  -- Mesma ordem para requisicoes concorrentes com multiplos anexos.
  for v_caminho in select r->>'caminho'
    from jsonb_array_elements(p_dados->'itens') i
    cross join lateral jsonb_array_elements(coalesce(i->'referencias','[]'::jsonb)) r
    order by r->>'caminho' loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('referencia-pedido:' || v_caminho, 0));
    select * into v_obj from storage.objects where bucket_id='referencias-pedidos' and name=v_caminho;
    if not found then raise exception 'REFERENCIAS_INVALIDAS'; end if;
    if v_obj.owner_id is distinct from p_usuario::text
       or v_obj.is_delete_marker or v_obj.archived_at is not null
       or jsonb_typeof(v_obj.metadata->'size') is distinct from 'number'
       or (v_obj.metadata->>'size') !~ '^[0-9]{1,6}$' then raise exception 'REFERENCIAS_INVALIDAS'; end if;
    if (v_obj.metadata->>'size')::integer not between 1 and 350000
       or (v_obj.metadata->>'mimetype') is distinct from
          case split_part(v_caminho,'.',2) when 'jpg' then 'image/jpeg' when 'png' then 'image/png' when 'webp' then 'image/webp' end then raise exception 'REFERENCIAS_INVALIDAS'; end if;
  end loop;
  for v_item in select x from jsonb_array_elements(p_dados->'itens') x loop
    select * into v_peca from public.pecas where id = (v_item->>'pecaId')::uuid;
    if not found or not v_peca.visivel or v_peca.arquivada then raise exception 'PECA_INDISPONIVEL'; end if;
    if v_peca.tipo_disponibilidade='pronta_entrega' then
      select coalesce(sum((i->>'quantidade')::integer), 0) into v_reservado
      from public.checkout_sessoes s cross join lateral jsonb_array_elements(s.itens) i
      where i->>'pecaId'=v_peca.id::text and (s.estado in ('processando','pendente') or (s.estado='preparado' and s.expira_em>now()));
      if v_peca.estoque_atual - v_reservado < (v_item->>'quantidade')::integer then raise exception 'ESTOQUE_INSUFICIENTE'; end if;
    end if;
    v_subtotal := v_subtotal + v_peca.preco_centavos * (v_item->>'quantidade')::bigint;
    v_itens := v_itens || jsonb_build_array(jsonb_build_object('pecaId',v_peca.id,'quantidade',(v_item->>'quantidade')::integer,'precoCentavos',v_peca.preco_centavos,'nome',v_peca.nome,'imagem',v_peca.imagem_capa_url,'prazo',v_peca.prazo_producao_dias,'reservarEstoque',v_peca.tipo_disponibilidade='pronta_entrega') || jsonb_strip_nulls(jsonb_build_object('personalizacao',v_item->'personalizacao','referencias',v_item->'referencias')));
  end loop;
  if v_subtotal + (p_frete->>'precoCentavos')::integer <> (p_dados->>'totalExibidoCentavos')::integer then raise exception 'VALOR_ALTERADO'; end if;
  insert into public.pedidos(id,cliente_id,forma_pagamento,subtotal_centavos,frete_centavos,total_centavos,modalidade_frete,prazo_estimado_dias,cliente_nome_snapshot,cliente_email_snapshot,cliente_cpf_snapshot,cliente_telefone_snapshot,entrega_destinatario,entrega_cep,entrega_logradouro,entrega_numero,entrega_complemento,entrega_bairro,entrega_cidade,entrega_uf,observacao_interna)
  values(v_id,p_usuario,p_dados->>'metodo',v_subtotal,(p_frete->>'precoCentavos')::integer,(p_dados->>'totalExibidoCentavos')::integer,p_frete->>'nome',greatest(1,(p_frete->>'prazoMaxDias')::integer),v_end->>'nome',p_email,p_dados->>'cpf',p_dados->>'telefone',v_end->>'nome',v_end->>'cep',v_end->>'logradouro',v_end->>'numero',v_end->>'complemento',v_end->>'bairro',v_end->>'cidade',v_end->>'uf','[TESTE MERCADO PAGO] Sem cobrança real. Pedido para validação da integração.') returning * into v_pedido;
  insert into public.itens_pedido(pedido_id,peca_id,nome_peca_snapshot,imagem_url_snapshot,preco_unitario_centavos,quantidade,prazo_producao_dias_snapshot,personalizacao,referencias)
  select v_id,(x->>'pecaId')::uuid,x->>'nome',x->>'imagem',(x->>'precoCentavos')::integer,(x->>'quantidade')::integer,(x->>'prazo')::integer,x->>'personalizacao',coalesce(x->'referencias','[]'::jsonb) from jsonb_array_elements(v_itens) x;
  insert into public.pagamentos(id,pedido_id,provedor,metodo,valor_centavos) values(v_id,v_id,'mercado_pago',p_dados->>'metodo',v_pedido.total_centavos);
  insert into public.checkout_sessoes(id,cliente_id,pedido_id,numero_pedido,ambiente,metodo,total_centavos,requisicao,itens)
  values(v_id,p_usuario,v_id,v_pedido.numero_pedido,'sandbox',p_dados->>'metodo',v_pedido.total_centavos,p_dados,v_itens) returning * into v_s;
  return to_jsonb(v_s);
end;
$$;

revoke all on function public.preparar_checkout(uuid,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.preparar_checkout(uuid,text,jsonb,jsonb) to service_role;
