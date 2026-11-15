begin;
select set_config('request.jwt.claims', jsonb_build_object('sub', (select id from public.perfis where perfil='admin' limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
do $teste$
declare
  categoria uuid;
  v_visivel uuid := gen_random_uuid();
  v_oculta uuid := gen_random_uuid();
  v_arquivada uuid := gen_random_uuid();
  total integer;
begin
  if not public.eh_admin() then raise exception 'O projeto não tem administrador disponível para o teste.'; end if;
  select id into categoria from public.categorias where ativa=true order by ordem limit 1;
  if categoria is null then raise exception 'Categoria ativa não encontrada.'; end if;
  insert into public.pecas (id,categoria_id,nome,descricao,preco_centavos,imagem_capa_url,tipo_disponibilidade,estoque_atual,prazo_producao_dias,visivel,arquivada)
  values (v_visivel,categoria,'Teste transacional visível','Registro de teste revertido ao final',12900,'https://pzzfuroafdulpfdtwdsi.supabase.co/storage/v1/object/public/pecas/teste-transacional.png','pronta_entrega',3,7,true,false),
         (v_oculta,categoria,'Teste transacional oculto','Registro de teste revertido ao final',8900,'https://pzzfuroafdulpfdtwdsi.supabase.co/storage/v1/object/public/pecas/teste-transacional.png','sob_encomenda',null,7,true,false),
         (v_arquivada,categoria,'Teste transacional arquivado','Registro de teste revertido ao final',18900,'https://pzzfuroafdulpfdtwdsi.supabase.co/storage/v1/object/public/pecas/teste-transacional.png','sob_encomenda',0,7,true,false);
  update public.pecas set preco_centavos=13990,prazo_producao_dias=10 where id=v_visivel;
  select count(*) into total from public.pecas where id=v_visivel and preco_centavos=13990 and prazo_producao_dias=10;
  if total<>1 then raise exception 'A edição não foi confirmada.'; end if;
  update public.pecas set visivel=false where id=v_oculta;
  select count(*) into total from public.pecas where id=v_oculta and visivel=false;
  if total<>1 then raise exception 'A ocultação não foi confirmada.'; end if;
  update public.pecas set visivel=true where id=v_oculta;
  select count(*) into total from public.pecas where id=v_oculta and visivel=true;
  if total<>1 then raise exception 'A restauração da visibilidade não foi confirmada.'; end if;
  update public.pecas set visivel=false where id=v_oculta;
  update public.pecas set arquivada=true,visivel=false where id=v_arquivada;
  select count(*) into total from public.pecas where id=v_arquivada and arquivada=true and visivel=false;
  if total<>1 then raise exception 'O arquivamento não foi confirmado.'; end if;
  perform set_config('mimos.teste_visivel',v_visivel::text,true);
  perform set_config('mimos.teste_oculta',v_oculta::text,true);
  perform set_config('mimos.teste_arquivada',v_arquivada::text,true);
end;
$teste$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $teste$
declare total integer; bloqueou boolean := false;
begin
  select count(*) into total from public.pecas where id=current_setting('mimos.teste_visivel')::uuid;
  if total<>1 then raise exception 'A peça visível não apareceu para o visitante.'; end if;
  select count(*) into total from public.pecas where id in (current_setting('mimos.teste_oculta')::uuid,current_setting('mimos.teste_arquivada')::uuid);
  if total<>0 then raise exception 'O visitante conseguiu ler peça oculta ou arquivada.'; end if;
  begin
    insert into public.pecas(categoria_id,nome,preco_centavos,imagem_capa_url,prazo_producao_dias)
    select id,'Teste proibido visitante',100,'https://example.invalid/teste.png',7 from public.categorias where ativa=true limit 1;
  exception when insufficient_privilege then bloqueou := true;
  end;
  if not bloqueou then raise exception 'A inserção por visitante não foi bloqueada.'; end if;
end;
$teste$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
do $teste$
declare alteradas integer; bloqueou boolean := false;
begin
  if public.eh_admin() then raise exception 'O perfil de teste recebeu acesso administrativo indevido.'; end if;
  update public.pecas set visivel=false where id=current_setting('mimos.teste_visivel')::uuid;
  get diagnostics alteradas=row_count;
  if alteradas<>0 then raise exception 'Uma conta sem perfil admin conseguiu alterar peça.'; end if;
  begin
    insert into public.pecas(categoria_id,nome,preco_centavos,imagem_capa_url,prazo_producao_dias)
    select id,'Teste proibido cliente',100,'https://example.invalid/teste.png',7 from public.categorias where ativa=true limit 1;
  exception when insufficient_privilege then bloqueou := true;
  end;
  if not bloqueou then raise exception 'A inserção sem perfil admin não foi bloqueada.'; end if;
end;
$teste$;
reset role;
rollback;
select jsonb_build_object('crud_admin','ok','visibilidade_publica','ok','bloqueio_visitante_cliente','ok','dados_de_teste','revertidos com rollback') as verificacao;
