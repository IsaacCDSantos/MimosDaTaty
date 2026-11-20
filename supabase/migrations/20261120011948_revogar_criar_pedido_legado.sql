-- criar_pedido é legado (o checkout usa preparar_checkout via Edge Function) e,
-- por ser SECURITY DEFINER, permitia a qualquer cliente logado criar pedidos sem pagamento.
revoke execute on function public.criar_pedido(jsonb, jsonb, text, integer, text, text) from public, anon, authenticated;
