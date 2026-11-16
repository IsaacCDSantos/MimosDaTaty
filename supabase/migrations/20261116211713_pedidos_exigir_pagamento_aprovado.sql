-- Preparada a partir do schema de produção, consultado somente para leitura.
-- Não corrige pedidos legados nem altera permissões ou sincronização financeira.
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create function public.exigir_pagamento_aprovado_no_andamento()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Webhook/checkout podem atualizar pagamento ou cancelar sem mudar para uma
  -- etapa protegida; observações/rastreio de legados não revalidam o andamento.
  if tg_op = 'UPDATE' then
    if new.status_pedido is not distinct from old.status_pedido then
      return new;
    end if;
  end if;

  if new.status_pedido in ('em_producao', 'enviado', 'entregue')
     and new.status_pagamento is distinct from 'aprovado' then
    raise exception using
      errcode = '23514',
      message = 'Pagamento aprovado é obrigatório para mudar para produção, envio ou entrega.',
      constraint = 'pedidos_andamento_exige_pagamento_aprovado';
  end if;
  return new;
end;
$$;

revoke all on function public.exigir_pagamento_aprovado_no_andamento() from public, anon, authenticated;

create trigger trg_pedidos_exigir_pagamento_aprovado
before insert or update on public.pedidos
for each row execute function public.exigir_pagamento_aprovado_no_andamento();
