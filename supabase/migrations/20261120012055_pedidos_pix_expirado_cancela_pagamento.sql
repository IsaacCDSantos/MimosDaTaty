-- Um Pix vencido marcava só a tentativa e o pagamento como "expirado"; o pedido
-- ficava "Aguardando pagamento" para sempre, porque o gatilho ignorava esse estado.
create or replace function public.sincronizar_pagamento_no_pedido() returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.status = 'aprovado' then
    new.pago_em := coalesce(new.pago_em, now());
    update public.pedidos set status_pagamento = 'aprovado', pago_em = coalesce(pago_em, new.pago_em), atualizado_em = now() where id = new.pedido_id;
  elsif new.status = 'estornado' then
    new.estornado_em := coalesce(new.estornado_em, now());
    update public.pedidos set status_pagamento = 'estornado', atualizado_em = now() where id = new.pedido_id;
  elsif new.status in ('recusado', 'cancelado', 'expirado') then
    -- O pedido não tem o estado "expirado": um Pix vencido sem pagamento encerra o pagamento como cancelado.
    update public.pedidos set status_pagamento = case when new.status = 'expirado' then 'cancelado' else new.status end, atualizado_em = now()
    where id = new.pedido_id and status_pagamento not in ('aprovado', 'estornado');
  end if;
  return new;
end;
$function$;

-- Corrige os pedidos que já ficaram presos: reaplica o estado atual para disparar o gatilho.
update public.pagamentos pg set status = pg.status
from public.pedidos p
where p.id = pg.pedido_id and pg.status = 'expirado' and p.status_pagamento = 'pendente';
