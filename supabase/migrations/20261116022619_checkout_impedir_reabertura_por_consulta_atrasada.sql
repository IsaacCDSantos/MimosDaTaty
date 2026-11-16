create or replace function public.aplicar_checkout(p_id uuid, p_resumo jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_s public.checkout_sessoes; v_item jsonb; v_estado text := p_resumo->>'estado';
begin
  select * into strict v_s from public.checkout_sessoes where id=p_id;
  perform id from public.pecas where id in (select (x->>'pecaId')::uuid from jsonb_array_elements(v_s.itens) x) order by id for update;
  select * into strict v_s from public.checkout_sessoes where id=p_id for update;
  if v_s.order_id is not null and v_s.order_id <> p_resumo->>'orderId' then raise exception 'ORDER_DIVERGENTE'; end if;
  if v_s.estado='estornado' or (v_s.estado='aprovado' and v_estado not in ('aprovado','estornado')) then return to_jsonb(v_s); end if;
  -- Uma consulta atrasada nunca reabre uma tentativa encerrada.
  if v_s.estado in ('cancelado','expirado','recusado') and v_estado in ('pendente','processando','preparado') then return to_jsonb(v_s); end if;
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
