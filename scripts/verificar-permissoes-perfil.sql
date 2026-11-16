-- Executar somente no projeto de teste autorizado. Todas as alterações são revertidas.
begin;
do $$
declare v_owner uuid; v_outro uuid;
begin
 select id into v_owner from auth.users where lower(email)='admin@mimosdataty.test';
 if v_owner is null then raise exception 'Crie a conta de teste admin@mimosdataty.test antes desta verificacao.'; end if;
 select id into v_outro from auth.users where id<>v_owner order by created_at limit 1;
 if v_outro is null then raise exception 'A verificacao de isolamento exige uma segunda conta existente.'; end if;
 perform set_config('mimos.rls_owner',v_owner::text,true);
 perform set_config('mimos.rls_outro',v_outro::text,true);
 perform set_config('mimos.rls_endereco_owner',gen_random_uuid()::text,true);
 perform set_config('mimos.rls_endereco_outro',gen_random_uuid()::text,true);
 -- A conta de teste assume perfil cliente somente dentro desta transacao.
 update public.perfis set perfil='cliente' where id=v_owner;
 insert into public.enderecos_cliente(id,cliente_id,destinatario,cep,logradouro,numero,bairro,cidade,uf,principal)
 values(current_setting('mimos.rls_endereco_owner')::uuid,v_owner,'Teste RLS','61940005','Rua de Teste','120','Centro','Maranguape','CE',false),
 (current_setting('mimos.rls_endereco_outro')::uuid,v_outro,'Teste RLS','61940005','Rua de Teste','120','Centro','Maranguape','CE',false);
 perform set_config('request.jwt.claim.sub',v_owner::text,true);
 perform set_config('request.jwt.claims',json_build_object('sub',v_owner::text,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
declare v_linhas integer;
begin
 update public.perfis set nome_completo='Nome Teste RLS',telefone='85999990000' where id=auth.uid();
 get diagnostics v_linhas=row_count;
 if v_linhas<>1 then raise exception 'Cliente nao conseguiu atualizar o proprio perfil.'; end if;
 select count(*) into v_linhas from public.perfis where id=current_setting('mimos.rls_outro')::uuid;
 if v_linhas<>0 then raise exception 'Cliente conseguiu ler o perfil de outra conta.'; end if;
 update public.perfis set nome_completo='Nunca persistir' where id=current_setting('mimos.rls_outro')::uuid;
 get diagnostics v_linhas=row_count;
 if v_linhas<>0 then raise exception 'Cliente conseguiu atualizar outra conta.'; end if;
 begin
  update public.perfis set perfil='admin' where id=auth.uid();
  raise exception 'Cliente conseguiu alterar a propria permissao.';
 exception when insufficient_privilege then null;
 end;
 update public.enderecos_cliente set numero='121' where id=current_setting('mimos.rls_endereco_owner')::uuid;
 get diagnostics v_linhas=row_count;
 if v_linhas<>1 then raise exception 'Cliente nao conseguiu editar seu endereco.'; end if;
 select count(*) into v_linhas from public.enderecos_cliente where id=current_setting('mimos.rls_endereco_outro')::uuid;
 if v_linhas<>0 then raise exception 'Cliente conseguiu ler endereco de outra conta.'; end if;
 update public.enderecos_cliente set numero='122' where id=current_setting('mimos.rls_endereco_outro')::uuid;
 get diagnostics v_linhas=row_count;
 if v_linhas<>0 then raise exception 'Cliente conseguiu editar endereco de outra conta.'; end if;
 begin
  update public.enderecos_cliente set cliente_id=current_setting('mimos.rls_outro')::uuid where id=current_setting('mimos.rls_endereco_owner')::uuid;
  raise exception 'Cliente conseguiu transferir endereco para outra conta.';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.enderecos_cliente(cliente_id,destinatario,cep,logradouro,numero,bairro,cidade,uf,principal)
  values(current_setting('mimos.rls_outro')::uuid,'Teste RLS','61940005','Rua de Teste','120','Centro','Maranguape','CE',false);
  raise exception 'Cliente conseguiu inserir endereco em outra conta.';
 exception when insufficient_privilege then null;
 end;
end $$;
set local role anon;
do $$
begin
 begin
  update public.perfis set nome_completo='Nunca persistir';
  raise exception 'Visitante conseguiu atualizar perfis.';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.enderecos_cliente(cliente_id,destinatario,cep,logradouro,numero,bairro,cidade,uf,principal)
  values(current_setting('mimos.rls_owner')::uuid,'Teste RLS','61940005','Rua de Teste','120','Centro','Maranguape','CE',false);
  raise exception 'Visitante conseguiu inserir endereco.';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'ok' as edicao_propria,'ok' as isolamento_entre_contas,'ok' as bloqueio_de_alteracao_de_perfil,'ok' as bloqueio_visitante,'rollback executado' as dados_de_teste;
