-- Controle privado do checkout. Todas as funções são invoker e executáveis somente pelo servidor.
create table public.checkout_sessoes (
  id uuid primary key,
  cliente_id uuid not null references public.perfis(id),
  pedido_id uuid not null unique references public.pedidos(id),
  numero_pedido bigint not null,
  ambiente text not null check (ambiente in ('sandbox','production')),
  metodo text not null check (metodo in ('pix','cartao_credito')),
  estado text not null default 'preparado' check (estado in ('preparado','processando','pendente','aprovado','recusado','cancelado','expirado','estornado')),
  total_centavos integer not null check (total_centavos > 0),
  requisicao jsonb not null,
  itens jsonb not null,
  order_id text unique,
  resposta jsonb not null default '{}'::jsonb,
  estoque_baixado boolean not null default false,
  expira_em timestamptz not null default now() + interval '10 minutes',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.checkout_sessoes enable row level security;
revoke all on public.checkout_sessoes from public, anon, authenticated;
grant all on public.checkout_sessoes to service_role;
create index checkout_sessoes_cliente_estado on public.checkout_sessoes(cliente_id, estado);
create index checkout_sessoes_reservas on public.checkout_sessoes(estado, expira_em) where estado in ('preparado','processando','pendente');

create function public.preparar_checkout(p_usuario uuid, p_email text, p_dados jsonb, p_frete jsonb)
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
  -- A ordenação dos bloqueios impede corridas entre compras concorrentes da mesma peça.
  perform id from public.pecas where id in (select (x->>'pecaId')::uuid from jsonb_array_elements(p_dados->'itens') x) order by id for update;
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
    v_itens := v_itens || jsonb_build_array(jsonb_build_object('pecaId',v_peca.id,'quantidade',(v_item->>'quantidade')::integer,'precoCentavos',v_peca.preco_centavos,'nome',v_peca.nome,'imagem',v_peca.imagem_capa_url,'prazo',v_peca.prazo_producao_dias,'reservarEstoque',v_peca.tipo_disponibilidade='pronta_entrega'));
  end loop;
  if v_subtotal + (p_frete->>'precoCentavos')::integer <> (p_dados->>'totalExibidoCentavos')::integer then raise exception 'VALOR_ALTERADO'; end if;
  insert into public.pedidos(id,cliente_id,forma_pagamento,subtotal_centavos,frete_centavos,total_centavos,modalidade_frete,prazo_estimado_dias,cliente_nome_snapshot,cliente_email_snapshot,cliente_cpf_snapshot,cliente_telefone_snapshot,entrega_destinatario,entrega_cep,entrega_logradouro,entrega_numero,entrega_complemento,entrega_bairro,entrega_cidade,entrega_uf)
  values(v_id,p_usuario,p_dados->>'metodo',v_subtotal,(p_frete->>'precoCentavos')::integer,(p_dados->>'totalExibidoCentavos')::integer,p_frete->>'nome',greatest(1,(p_frete->>'prazoMaxDias')::integer),v_end->>'nome',p_email,p_dados->>'cpf',p_dados->>'telefone',v_end->>'nome',v_end->>'cep',v_end->>'logradouro',v_end->>'numero',v_end->>'complemento',v_end->>'bairro',v_end->>'cidade',v_end->>'uf') returning * into v_pedido;
  insert into public.itens_pedido(pedido_id,peca_id,nome_peca_snapshot,imagem_url_snapshot,preco_unitario_centavos,quantidade,prazo_producao_dias_snapshot)
  select v_id,(x->>'pecaId')::uuid,x->>'nome',x->>'imagem',(x->>'precoCentavos')::integer,(x->>'quantidade')::integer,(x->>'prazo')::integer from jsonb_array_elements(v_itens) x;
  insert into public.pagamentos(id,pedido_id,provedor,metodo,valor_centavos) values(v_id,v_id,'mercado_pago',p_dados->>'metodo',v_pedido.total_centavos);
  insert into public.checkout_sessoes(id,cliente_id,pedido_id,numero_pedido,ambiente,metodo,total_centavos,requisicao,itens)
  values(v_id,p_usuario,v_id,v_pedido.numero_pedido,'sandbox',p_dados->>'metodo',v_pedido.total_centavos,p_dados,v_itens) returning * into v_s;
  return to_jsonb(v_s);
end;
$$;

create function public.iniciar_checkout(p_id uuid, p_parcelas integer)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_s public.checkout_sessoes;
begin
  select * into strict v_s from public.checkout_sessoes where id=p_id;
  perform id from public.pecas where id in (select (x->>'pecaId')::uuid from jsonb_array_elements(v_s.itens) x) order by id for update;
  select * into strict v_s from public.checkout_sessoes where id=p_id for update;
  if v_s.estado='processando' then return; end if;
  if v_s.estado<>'preparado' or v_s.expira_em<=now() then raise exception 'SESSAO_EXPIRADA'; end if;
  update public.checkout_sessoes set estado='processando',expira_em=now()+interval '30 minutes',atualizado_em=now() where id=p_id;
  update public.pagamentos set status='em_processamento',parcelas=p_parcelas where id=p_id;
end;
$$;

create function public.aplicar_checkout(p_id uuid, p_resumo jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_s public.checkout_sessoes; v_item jsonb; v_estado text := p_resumo->>'estado';
begin
  select * into strict v_s from public.checkout_sessoes where id=p_id;
  perform id from public.pecas where id in (select (x->>'pecaId')::uuid from jsonb_array_elements(v_s.itens) x) order by id for update;
  select * into strict v_s from public.checkout_sessoes where id=p_id for update;
  if v_s.order_id is not null and v_s.order_id <> p_resumo->>'orderId' then raise exception 'ORDER_DIVERGENTE'; end if;
  if v_s.estado='estornado' or (v_s.estado='aprovado' and v_estado not in ('aprovado','estornado')) then return to_jsonb(v_s); end if;
  if v_estado='aprovado' and not v_s.estoque_baixado then
    for v_item in select x from jsonb_array_elements(v_s.itens) x where (x->>'reservarEstoque')::boolean loop
      update public.pecas set estoque_atual=estoque_atual-(v_item->>'quantidade')::integer where id=(v_item->>'pecaId')::uuid and estoque_atual >= (v_item->>'quantidade')::integer;
      if not found then raise exception 'ESTOQUE_DIVERGENTE'; end if;
    end loop;
    update public.checkout_sessoes set estoque_baixado=true where id=p_id;
  end if;
  update public.checkout_sessoes set estado=v_estado, order_id=p_resumo->>'orderId',resposta=p_resumo,atualizado_em=now() where id=p_id returning * into v_s;
  update public.pagamentos set status=case when v_estado='pendente' then 'pendente' else v_estado end,transacao_externa_id=v_s.order_id,pix_copia_cola=p_resumo->>'pixCopiaCola',pix_expira_em=case when v_s.metodo='pix' then v_s.expira_em else null end,detalhes_gateway=jsonb_build_object('order_id',v_s.order_id,'status',p_resumo->>'statusProvedor','status_detail',p_resumo->>'detalheProvedor','ambiente',v_s.ambiente) where id=p_id;
  return to_jsonb(v_s);
end;
$$;

create function public.falhar_checkout(p_id uuid)
returns void language sql security invoker set search_path = '' as $$
  update public.checkout_sessoes set estado='recusado',atualizado_em=now() where id=p_id and order_id is null and estado='processando';
  update public.pagamentos set status='recusado' where id=p_id and exists(select 1 from public.checkout_sessoes where id=p_id and estado='recusado' and order_id is null);
$$;

create function public.cancelar_checkout_preparado(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.checkout_sessoes where id=p_id and estado='preparado' for update;
  if not found then raise exception 'TENTATIVA_DIFERENTE'; end if;
  update public.checkout_sessoes set estado='cancelado',atualizado_em=now() where id=p_id;
  update public.pagamentos set status='cancelado' where id=p_id;
  update public.pedidos set status_pedido='cancelado',motivo_cancelamento='Checkout alterado antes de enviar o pagamento' where id=p_id;
end;
$$;

revoke all on function public.preparar_checkout(uuid,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.iniciar_checkout(uuid,integer) from public, anon, authenticated;
revoke all on function public.aplicar_checkout(uuid,jsonb) from public, anon, authenticated;
revoke all on function public.falhar_checkout(uuid) from public, anon, authenticated;
revoke all on function public.cancelar_checkout_preparado(uuid) from public, anon, authenticated;
grant execute on function public.preparar_checkout(uuid,text,jsonb,jsonb),public.iniciar_checkout(uuid,integer),public.aplicar_checkout(uuid,jsonb),public.falhar_checkout(uuid),public.cancelar_checkout_preparado(uuid) to service_role;
