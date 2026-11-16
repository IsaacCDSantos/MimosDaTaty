create or replace function public.cancelar_checkout_preparado(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_s public.checkout_sessoes;
begin
  select * into strict v_s from public.checkout_sessoes where id=p_id for update;
  -- Com order enviada, o backend precisa confirmar e persistir seu cancelamento primeiro.
  if not ((v_s.estado='preparado' and v_s.order_id is null) or v_s.estado='cancelado') then
    raise exception 'TENTATIVA_DIFERENTE';
  end if;
  update public.checkout_sessoes set estado='cancelado',atualizado_em=now() where id=p_id;
  update public.pagamentos set status='cancelado' where id=p_id;
  update public.pedidos set status_pedido='cancelado',motivo_cancelamento='Forma de pagamento alterada pelo cliente' where id=p_id;
end;
$$;
revoke all on function public.cancelar_checkout_preparado(uuid) from public, anon, authenticated;
grant execute on function public.cancelar_checkout_preparado(uuid) to service_role;
