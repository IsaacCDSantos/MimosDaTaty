grant select(id) on public.perfis to service_role;
grant select on public.pecas to service_role;
grant update(estoque_atual) on public.pecas to service_role;
grant select, insert on public.pedidos, public.itens_pedido, public.pagamentos to service_role;
grant update(status_pedido,motivo_cancelamento) on public.pedidos to service_role;
grant update(status,parcelas,transacao_externa_id,pix_copia_cola,pix_expira_em,detalhes_gateway) on public.pagamentos to service_role;
grant usage, select on sequence public.pedidos_numero_pedido_seq to service_role;
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
  insert into public.pedidos(id,cliente_id,forma_pagamento,subtotal_centavos,frete_centavos,total_centavos,modalidade_frete,prazo_estimado_dias,cliente_nome_snapshot,cliente_email_snapshot,cliente_cpf_snapshot,cliente_telefone_snapshot,entrega_destinatario,entrega_cep,entrega_logradouro,entrega_numero,entrega_complemento,entrega_bairro,entrega_cidade,entrega_uf,observacao_interna)
  values(v_id,p_usuario,p_dados->>'metodo',v_subtotal,(p_frete->>'precoCentavos')::integer,(p_dados->>'totalExibidoCentavos')::integer,p_frete->>'nome',greatest(1,(p_frete->>'prazoMaxDias')::integer),v_end->>'nome',p_email,p_dados->>'cpf',p_dados->>'telefone',v_end->>'nome',v_end->>'cep',v_end->>'logradouro',v_end->>'numero',v_end->>'complemento',v_end->>'bairro',v_end->>'cidade',v_end->>'uf','[TESTE MERCADO PAGO] Sem cobrança real. Pedido para validação da integração.') returning * into v_pedido;
  insert into public.itens_pedido(pedido_id,peca_id,nome_peca_snapshot,imagem_url_snapshot,preco_unitario_centavos,quantidade,prazo_producao_dias_snapshot)
  select v_id,(x->>'pecaId')::uuid,x->>'nome',x->>'imagem',(x->>'precoCentavos')::integer,(x->>'quantidade')::integer,(x->>'prazo')::integer from jsonb_array_elements(v_itens) x;
  insert into public.pagamentos(id,pedido_id,provedor,metodo,valor_centavos) values(v_id,v_id,'mercado_pago',p_dados->>'metodo',v_pedido.total_centavos);
  insert into public.checkout_sessoes(id,cliente_id,pedido_id,numero_pedido,ambiente,metodo,total_centavos,requisicao,itens)
  values(v_id,p_usuario,v_id,v_pedido.numero_pedido,'sandbox',p_dados->>'metodo',v_pedido.total_centavos,p_dados,v_itens) returning * into v_s;
  return to_jsonb(v_s);
end;
$$;
