-- EXECUTAR SOMENTE EM CLONE/AMBIENTE LOCAL, como postgres, após revisar/aplicar a
-- migração nesse ambiente. Nunca executar estas fixtures no projeto de produção.
-- Exemplo psql: \set ON_ERROR_STOP on
-- As linhas storage.objects abaixo são metadados fictícios, sem arquivo no S3;
-- servem apenas para testar SQL/RLS. Upload/download reais exigem Storage API.
-- ROLLBACK remove todas as fixtures, mas nextval NÃO é transacional:
-- preparar_checkout consome números de pedido mesmo com rollback (não os restaura).
-- Não chama iniciar_checkout, Mercado Pago, webhook ou qualquer API de cobrança.
begin;
set local transaction isolation level read committed;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

create function pg_temp.verificar(ok boolean, mensagem text) returns void
language plpgsql security invoker as $$
begin if ok is distinct from true then raise exception 'FALHOU: %', mensagem; end if; end;
$$;
grant usage on schema pg_temp to service_role, authenticated;
create function pg_temp.esperar_erro(comando text, codigo text) returns void
language plpgsql security invoker as $$
begin
  begin
    execute comando;
  exception when others then
    if position(codigo in sqlerrm)>0 then return; end if;
    raise;
  end;
  raise exception 'FALHOU: esperava erro %', codigo;
end;
$$;
create function pg_temp.ref(dono text, chave text, peca text, hash text default 'a', ext text default 'jpg')
returns jsonb language sql immutable security invoker as $$
  select jsonb_build_object('caminho',dono||'/'||chave||'/'||peca||'/'||repeat(hash,64)||'.'||ext,'nome','Referencia ficticia.'||ext);
$$;
create function pg_temp.preparar(dados jsonb) returns jsonb
language sql security invoker as $$
  select public.preparar_checkout('f090ae4f-0000-4000-8000-000000000001','fixture-checkout@example.test',dados,
    '{"nome":"Frete fixture","precoCentavos":1000,"prazoMaxDias":5}'::jsonb);
$$;

-- IDs exclusivos desta verificação; colisão aborta, não altera dados existentes.
insert into auth.users(id,email) values
 ('f090ae4f-0000-4000-8000-000000000001','fixture-checkout@example.test'),
 ('f090ae4f-0000-4000-8000-000000000002','fixture-outro@example.test'),
 ('f090ae4f-0000-4000-8000-000000000003','fixture-admin@example.test');
-- O trigger de auth cria perfis; não desabilitar triggers existentes.
update public.perfis set perfil='admin' where id='f090ae4f-0000-4000-8000-000000000003';
insert into public.categorias(id,nome) values ('f090ae4f-0000-4000-8000-000000000004','Fixture checkout personalizacao f090ae4f');
insert into public.pecas(id,categoria_id,nome,preco_centavos,imagem_capa_url,tipo_disponibilidade,estoque_atual,prazo_producao_dias)
values
 ('f090ae4f-0000-4000-8000-000000000005','f090ae4f-0000-4000-8000-000000000004','Peca fixture A',2000,'https://example.test/fixture-a.jpg','pronta_entrega',5,7),
 ('f090ae4f-0000-4000-8000-000000000006','f090ae4f-0000-4000-8000-000000000004','Peca fixture B',1000,'https://example.test/fixture-b.jpg','sob_encomenda',null,7);

create temp table contexto(dados jsonb, sessao jsonb);
grant all on contexto to service_role, authenticated;
insert into contexto(dados) values (jsonb_build_object(
 'chave','f090ae4f-0000-4000-8000-000000000010','metodo','pix','cpf','12345678909','telefone','85999999999',
 'totalExibidoCentavos',6000,'servicoFrete','1',
 'endereco','{"nome":"Fixture","cep":"61940005","logradouro":"Rua Fixture","numero":"1","complemento":"","bairro":"Centro","cidade":"Maranguape","uf":"CE"}'::jsonb,
 'itens',jsonb_build_array(
   jsonb_build_object('pecaId','f090ae4f-0000-4000-8000-000000000005','quantidade',2,'personalizacao','Azul',
     'referencias',jsonb_build_array(pg_temp.ref('f090ae4f-0000-4000-8000-000000000001','f090ae4f-0000-4000-8000-000000000010','f090ae4f-0000-4000-8000-000000000005'))),
   jsonb_build_object('pecaId','f090ae4f-0000-4000-8000-000000000006','quantidade',1,'personalizacao','Rosa',
     'referencias',jsonb_build_array(pg_temp.ref('f090ae4f-0000-4000-8000-000000000001','f090ae4f-0000-4000-8000-000000000010','f090ae4f-0000-4000-8000-000000000006','b','png'))))));

select pg_temp.verificar((select not public and file_size_limit=350000 and allowed_mime_types=array['image/jpeg','image/png','image/webp'] from storage.buckets where id='referencias-pedidos'),'Bucket privado/limites');
select pg_temp.verificar(not has_function_privilege('authenticated','public.preparar_checkout(uuid,text,jsonb,jsonb)','execute'),'RPC apenas servidor');
select pg_temp.verificar(has_table_privilege('service_role','storage.objects','select'),'Servidor consulta metadados');

-- Testes INSERT/SELECT/UPDATE/DELETE do Storage com papel real de cliente.
set local role authenticated;
select set_config('request.jwt.claim.sub','f090ae4f-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"f090ae4f-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into storage.objects(bucket_id,name,owner_id,metadata)
select 'referencias-pedidos',r->>'caminho','f090ae4f-0000-4000-8000-000000000001',
  jsonb_build_object('size',350000,'mimetype',case when r->>'caminho' like '%.png' then 'image/png' else 'image/jpeg' end)
from contexto cross join lateral jsonb_array_elements(dados->'itens') i
cross join lateral jsonb_array_elements(i->'referencias') r;
select pg_temp.esperar_erro($cmd$
 insert into storage.objects(bucket_id,name,owner_id) values ('referencias-pedidos',
 'f090ae4f-0000-4000-8000-000000000002/f090ae4f-0000-4000-8000-000000000010/f090ae4f-0000-4000-8000-000000000005/'||repeat('a',64)||'.jpg',
 'f090ae4f-0000-4000-8000-000000000001')
$cmd$,'row-level security');
select pg_temp.esperar_erro($cmd$
 insert into storage.objects(bucket_id,name,owner_id) values ('referencias-pedidos','https://example.test/foto.jpg','f090ae4f-0000-4000-8000-000000000001')
$cmd$,'row-level security');
select pg_temp.verificar((select count(*)=2 from storage.objects where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001'),'Dono ve suas fotos');
with mudou as (update storage.objects set metadata='{}' where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001' returning id)
select pg_temp.verificar((select count(*)=0 from mudou),'UPDATE negado: sem sobrescrita');
-- Foto solta pode ser removida antes de existir um item de pedido.
insert into storage.objects(bucket_id,name,owner_id,metadata)
select 'referencias-pedidos',pg_temp.ref('f090ae4f-0000-4000-8000-000000000001','f090ae4f-0000-4000-8000-000000000010','f090ae4f-0000-4000-8000-000000000005','c')->>'caminho','f090ae4f-0000-4000-8000-000000000001','{"size":100,"mimetype":"image/jpeg"}';
with removido as (delete from storage.objects where bucket_id='referencias-pedidos' and name like '%/'||repeat('c',64)||'.jpg' returning id)
select pg_temp.verificar((select count(*)=1 from removido),'DELETE de foto solta permitido');
reset role;

-- Ataques diretos no RPC; nenhum deve criar pedido ou sessão.
set local role service_role;
do $$
declare d jsonb := (select dados from contexto); ataque jsonb; c text;
begin
  for ataque,c in select * from (values
    (jsonb_set(d,'{itens,0,personalizacao}',to_jsonb(repeat('x',1001))),'PERSONALIZACAO_INVALIDA'),
    (jsonb_set(d,'{itens,0,personalizacao}','null'::jsonb),'PERSONALIZACAO_INVALIDA'),
    (jsonb_set(d,'{itens,0,referencias}','null'::jsonb),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,nome}',to_jsonb(repeat('x',121))),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,bytes}','"base64"'::jsonb),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias}',jsonb_build_array(d#>'{itens,0,referencias,0}',d#>'{itens,0,referencias,0}')),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,caminho}',to_jsonb('https://example.test/foto.jpg'::text)),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,caminho}',to_jsonb('data:image/png;base64,aGVsbG8='::text)),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,caminho}',to_jsonb(replace(d#>>'{itens,0,referencias,0,caminho}','000000000001/','000000000002/'))),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,caminho}',to_jsonb(replace(d#>>'{itens,0,referencias,0,caminho}','000000000010/','000000000011/'))),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,caminho}',to_jsonb(replace(d#>>'{itens,0,referencias,0,caminho}','000000000005/','000000000006/'))),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens,0,referencias,0,caminho}',to_jsonb(replace(d#>>'{itens,0,referencias,0,caminho}',repeat('a',64),repeat('e',64)))),'REFERENCIAS_INVALIDAS'),
    (jsonb_set(d,'{itens}',jsonb_build_array(d#>'{itens,0}',d#>'{itens,0}')),'ITEM_DUPLICADO')
  ) as ataques(dados,codigo) loop
    perform pg_temp.esperar_erro(format('select pg_temp.preparar(%L::jsonb)',ataque::text),c);
  end loop;
  ataque:=jsonb_set(d,'{itens,0,referencias}',(select jsonb_agg(pg_temp.ref('f090ae4f-0000-4000-8000-000000000001','f090ae4f-0000-4000-8000-000000000010','f090ae4f-0000-4000-8000-000000000005',g::text)) from generate_series(0,6) g));
  perform pg_temp.esperar_erro(format('select pg_temp.preparar(%L::jsonb)',ataque::text),'REFERENCIAS_INVALIDAS');
  ataque:=jsonb_set(d,'{itens}',(select jsonb_agg(d#>'{itens,0}') from generate_series(1,31)));
  perform pg_temp.esperar_erro(format('select pg_temp.preparar(%L::jsonb)',ataque::text),'ITENS_INVALIDOS');
end;
$$;
reset role;

-- Metadados presentes mas inválidos: proprietário, tamanho, MIME/extensão.
do $$
declare original jsonb; invalido jsonb;
begin
  select metadata into original from storage.objects where name=(select dados#>>'{itens,0,referencias,0,caminho}' from contexto) and bucket_id='referencias-pedidos';
  for invalido in select value from jsonb_array_elements('[{"size":350001,"mimetype":"image/jpeg"},{"size":0,"mimetype":"image/jpeg"},{"size":"100","mimetype":"image/jpeg"},{"size":100,"mimetype":"image/png"},{"size":100},{"mimetype":"image/jpeg"},{"size":1.5,"mimetype":"image/jpeg"}]'::jsonb) loop
    update storage.objects set metadata=invalido where name=(select dados#>>'{itens,0,referencias,0,caminho}' from contexto) and bucket_id='referencias-pedidos';
    set local role service_role;
    perform pg_temp.esperar_erro('select pg_temp.preparar(dados) from contexto','REFERENCIAS_INVALIDAS');
    reset role;
  end loop;
  update storage.objects set metadata=original,owner_id='f090ae4f-0000-4000-8000-000000000002' where name=(select dados#>>'{itens,0,referencias,0,caminho}' from contexto) and bucket_id='referencias-pedidos';
  set local role service_role;
  perform pg_temp.esperar_erro('select pg_temp.preparar(dados) from contexto','REFERENCIAS_INVALIDAS');
  reset role;
  update storage.objects set owner_id='f090ae4f-0000-4000-8000-000000000001' where name=(select dados#>>'{itens,0,referencias,0,caminho}' from contexto) and bucket_id='referencias-pedidos';
end;
$$;

-- Persistência, preço/estoque, retry e snapshots por peça.
set local role service_role;
update contexto set sessao=pg_temp.preparar(dados);
select pg_temp.verificar((select count(*)=2 from public.itens_pedido where pedido_id='f090ae4f-0000-4000-8000-000000000010'),'Dois snapshots');
select pg_temp.verificar((select personalizacao='Azul' and referencias=(select dados#>'{itens,0,referencias}' from contexto) and quantidade=2 and preco_unitario_centavos=2000 from public.itens_pedido where pedido_id='f090ae4f-0000-4000-8000-000000000010' and peca_id='f090ae4f-0000-4000-8000-000000000005'),'Peca A correta');
select pg_temp.verificar((select personalizacao='Rosa' and referencias=(select dados#>'{itens,1,referencias}' from contexto) from public.itens_pedido where pedido_id='f090ae4f-0000-4000-8000-000000000010' and peca_id='f090ae4f-0000-4000-8000-000000000006'),'Peca B correta');
select pg_temp.verificar((select sessao->>'ambiente'='sandbox' and sessao->>'total_centavos'='6000' and sessao->>'estado'='preparado' and sessao->>'order_id' is null from contexto),'Sandbox sem cobrança');
select pg_temp.verificar((select estoque_atual=5 from public.pecas where id='f090ae4f-0000-4000-8000-000000000005'),'Preparacao nao baixa estoque');
select pg_temp.verificar((select (pg_temp.preparar(dados)->>'id')=(sessao->>'id') from contexto),'Retry recupera mesma sessao');
select pg_temp.esperar_erro($cmd$select pg_temp.preparar(jsonb_set(dados,'{itens,0,personalizacao}','"Verde"'::jsonb)) from contexto$cmd$,'TENTATIVA_DIFERENTE');
select pg_temp.verificar((select count(*)=1 from public.pedidos where id='f090ae4f-0000-4000-8000-000000000010'),'Retry nao duplica pedido');

-- Sem extras: mesmas entradas de versões anteriores, recuperação em outra aba.
update contexto set dados=jsonb_set(jsonb_set(dados,'{chave}','"f090ae4f-0000-4000-8000-000000000011"'),'{itens}',(select jsonb_agg(i-'personalizacao'-'referencias') from jsonb_array_elements(dados->'itens') i));
select pg_temp.esperar_erro($cmd$select pg_temp.preparar(jsonb_set(dados,'{totalExibidoCentavos}','1')) from contexto$cmd$,'VALOR_ALTERADO');
update contexto set sessao=pg_temp.preparar(dados);
select pg_temp.verificar((select bool_and(personalizacao is null and referencias='[]'::jsonb) from public.itens_pedido where pedido_id='f090ae4f-0000-4000-8000-000000000011'),'Legado sem extras');
select pg_temp.verificar((select pg_temp.preparar(jsonb_set(dados,'{chave}','"f090ae4f-0000-4000-8000-000000000012"'))->>'id'='f090ae4f-0000-4000-8000-000000000011' from contexto),'Recuperacao em outra aba preservada');
-- 4 unidades reservadas por duas sessões, estoque=5: nova reserva de 2 falha.
select pg_temp.esperar_erro($cmd$select pg_temp.preparar(jsonb_set(jsonb_set(dados,'{chave}','"f090ae4f-0000-4000-8000-000000000012"'),'{itens,0,personalizacao}','"Nova tentativa"')) from contexto$cmd$,'ESTOQUE_INSUFICIENTE');
select public.cancelar_checkout_preparado('f090ae4f-0000-4000-8000-000000000010');
-- Sem reserva de pronta entrega, conferir alteração de nota com chave nova e teto
-- de três sessões ativas, sem interferir em pedidos reais.
do $$
declare d jsonb := (select dados from contexto); s jsonb;
begin
  d:=jsonb_set(jsonb_set(d,'{itens}',jsonb_build_array(jsonb_build_object('pecaId','f090ae4f-0000-4000-8000-000000000006','quantidade',1,'personalizacao','Nota A'))),'{totalExibidoCentavos}','2000');
  d:=jsonb_set(d,'{chave}','"f090ae4f-0000-4000-8000-000000000012"');
  s:=pg_temp.preparar(d);
  perform pg_temp.verificar(s->>'id'='f090ae4f-0000-4000-8000-000000000012','Nova sessao para conteudo novo');
  d:=jsonb_set(jsonb_set(d,'{chave}','"f090ae4f-0000-4000-8000-000000000013"'),'{itens,0,personalizacao}','"Nota B"');
  s:=pg_temp.preparar(d);
  perform pg_temp.verificar(s->>'id'='f090ae4f-0000-4000-8000-000000000013','Nota alterada nao recupera sessao anterior');
  d:=jsonb_set(jsonb_set(d,'{chave}','"f090ae4f-0000-4000-8000-000000000014"'),'{itens,0,personalizacao}','"Nota C"');
  perform pg_temp.esperar_erro(format('select pg_temp.preparar(%L::jsonb)',d::text),'LIMITE_TENTATIVAS');
end;
$$;
reset role;

-- Cancelamento preserva anexos. Outro cliente não vê nem remove; admin só lê.
set local role authenticated;
select set_config('request.jwt.claim.sub','f090ae4f-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"f090ae4f-0000-4000-8000-000000000001","role":"authenticated"}',true);
with removido as (delete from storage.objects where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001' returning id)
select pg_temp.verificar((select count(*)=0 from removido),'Anexos de pedido cancelado preservados');
select pg_temp.verificar((select count(*)=4 from public.itens_pedido where pedido_id in ('f090ae4f-0000-4000-8000-000000000010','f090ae4f-0000-4000-8000-000000000011')),'Cliente ve seus itens');
select set_config('request.jwt.claim.sub','f090ae4f-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"f090ae4f-0000-4000-8000-000000000002","role":"authenticated"}',true);
select pg_temp.verificar((select count(*)=0 from storage.objects where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001'),'Outro cliente nao ve anexos');
select pg_temp.verificar((select count(*)=0 from public.itens_pedido where pedido_id='f090ae4f-0000-4000-8000-000000000010'),'Outro cliente nao ve itens');
with removido as (delete from storage.objects where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001' returning id)
select pg_temp.verificar((select count(*)=0 from removido),'Outro cliente nao remove anexos');
select set_config('request.jwt.claim.sub','f090ae4f-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"f090ae4f-0000-4000-8000-000000000003","role":"authenticated"}',true);
select pg_temp.verificar((select count(*)=2 from storage.objects where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001'),'Admin consulta anexos');
select pg_temp.verificar((select count(*)=2 from public.itens_pedido where pedido_id='f090ae4f-0000-4000-8000-000000000010'),'Admin consulta itens');
with removido as (delete from storage.objects where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001' returning id)
select pg_temp.verificar((select count(*)=0 from removido),'Admin nao remove anexos do cliente');
with mudou as (update storage.objects set metadata='{}' where bucket_id='referencias-pedidos' and owner_id='f090ae4f-0000-4000-8000-000000000001' returning id)
select pg_temp.verificar((select count(*)=0 from mudou),'Admin nao sobrescreve anexos');
reset role;
rollback;

-- Concorrência (manual, somente clone, duas sessões SQL independentes):
-- 1. Cliente inicia DELETE de foto solta e mantém a transação aberta;
--    preparar_checkout deve aguardar o advisory lock e falhar após o commit DELETE.
-- 2. Servidor prepara pedido e mantém a transação aberta; DELETE do cliente deve
--    aguardar e retornar zero linhas após commit, inclusive se pedido cancelado.
-- Conferir também upload real >350000/MIME inválido e upsert:true pelo Storage
-- API no clone: limites físicos são aplicados pelo serviço, não por INSERT SQL.
