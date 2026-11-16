-- Execute como postgres no SQL Editor. Todos os dados de teste são revertidos.
begin;

do $teste$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_oculta uuid := gen_random_uuid();
  v_arquivada uuid := gen_random_uuid();
  v_categoria uuid;
  v_imagem text;
  v_admin uuid;
  v_sufixo text := gen_random_uuid()::text;
begin
  select id into v_admin from public.perfis where perfil = 'admin' order by id limit 1;
  if v_admin is null then raise exception 'É necessária uma conta admin para executar este teste.'; end if;
  select p.categoria_id, p.imagem_capa_url into v_categoria, v_imagem
    from public.pecas p join public.categorias c on c.id = p.categoria_id
    where c.ativa order by p.id limit 1;
  if v_categoria is null or v_imagem is null then
    raise exception 'É necessária uma peça com foto e categoria ativa para preparar os testes.';
  end if;

  insert into public.pecas (
    id, categoria_id, nome, descricao, preco_centavos, imagem_capa_url,
    tipo_disponibilidade, estoque_atual, prazo_producao_dias, visivel, arquivada
  ) values
    (v_a, v_categoria, 'A Teste de visualizações ' || v_sufixo, 'Fixture revertida por rollback', 10000, v_imagem, 'sob_encomenda', 0, 7, true, false),
    (v_b, v_categoria, 'A Teste de visualizações ' || v_sufixo, 'Fixture revertida por rollback', 10000, v_imagem, 'sob_encomenda', 0, 7, true, false),
    (v_c, v_categoria, 'Z Teste de visualizações ' || v_sufixo, 'Fixture revertida por rollback', 10000, v_imagem, 'sob_encomenda', 0, 7, true, false),
    (v_oculta, v_categoria, 'Teste oculto ' || v_sufixo, 'Fixture revertida por rollback', 10000, v_imagem, 'sob_encomenda', 0, 7, true, false),
    (v_arquivada, v_categoria, 'Teste arquivado ' || v_sufixo, 'Fixture revertida por rollback', 10000, v_imagem, 'sob_encomenda', 0, 7, true, false);

  perform set_config('mimos.views_a', v_a::text, true);
  perform set_config('mimos.views_b', v_b::text, true);
  perform set_config('mimos.views_c', v_c::text, true);
  perform set_config('mimos.views_oculta', v_oculta::text, true);
  perform set_config('mimos.views_arquivada', v_arquivada::text, true);
  perform set_config('mimos.views_abertura', gen_random_uuid()::text, true);
  perform set_config('mimos.views_admin', v_admin::text, true);
end;
$teste$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $teste$
declare
  v_a uuid := current_setting('mimos.views_a')::uuid;
  v_b uuid := current_setting('mimos.views_b')::uuid;
  v_abertura uuid := current_setting('mimos.views_abertura')::uuid;
  bloqueou boolean;
begin
  if public.registrar_visualizacao_peca(v_a, v_abertura) is distinct from true then
    raise exception 'A primeira abertura não foi registrada.';
  end if;
  if public.registrar_visualizacao_peca(v_a, v_abertura) is distinct from false then
    raise exception 'A mesma abertura foi contabilizada novamente.';
  end if;
  if public.registrar_visualizacao_peca(v_a, gen_random_uuid()) is distinct from true then
    raise exception 'Uma nova abertura legítima não foi registrada.';
  end if;
  if not public.registrar_visualizacao_peca(v_b, gen_random_uuid())
    or not public.registrar_visualizacao_peca(v_b, gen_random_uuid()) then
    raise exception 'Não foi possível preparar o empate de visualizações.';
  end if;
  if not public.registrar_visualizacao_peca(current_setting('mimos.views_oculta')::uuid, gen_random_uuid())
    or not public.registrar_visualizacao_peca(current_setting('mimos.views_arquivada')::uuid, gen_random_uuid()) then
    raise exception 'Não foi possível preparar peças que serão ocultadas e arquivadas.';
  end if;
  if public.registrar_visualizacao_peca(null, v_abertura)
    or public.registrar_visualizacao_peca(v_a, null)
    or public.registrar_visualizacao_peca(gen_random_uuid(), v_abertura) then
    raise exception 'Parâmetros ausentes ou peça inexistente geraram uma visualização.';
  end if;

  bloqueou := false;
  begin
    perform 1 from public.listar_destaques_catalogo(200, 0);
  exception when insufficient_privilege then bloqueou := true;
  end;
  if not bloqueou then raise exception 'O visitante conseguiu consultar o ranking administrativo.'; end if;

  bloqueou := false;
  begin
    insert into private.visualizacoes_pecas (peca_id, abertura_id) values (v_a, gen_random_uuid());
  exception when insufficient_privilege then bloqueou := true;
  end;
  if not bloqueou then raise exception 'O visitante conseguiu inserir diretamente na tabela privada.'; end if;
end;
$teste$;

reset role;
-- Somente as fixtures desta transação são alteradas; nenhuma peça real é modificada.
update public.pecas set visivel = false where id = current_setting('mimos.views_oculta')::uuid;
update public.pecas set visivel = false, arquivada = true where id = current_setting('mimos.views_arquivada')::uuid;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $teste$
begin
  if public.registrar_visualizacao_peca(current_setting('mimos.views_oculta')::uuid, gen_random_uuid())
    or public.registrar_visualizacao_peca(current_setting('mimos.views_arquivada')::uuid, gen_random_uuid()) then
    raise exception 'Peça oculta ou arquivada aceitou uma nova visualização.';
  end if;
end;
$teste$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
do $teste$
declare total integer; bloqueou boolean := false;
begin
  if public.eh_admin() then raise exception 'O cliente de teste foi reconhecido como administrador.'; end if;
  select count(*) into total from private.visualizacoes_pecas
    where peca_id in (current_setting('mimos.views_a')::uuid, current_setting('mimos.views_b')::uuid);
  if total <> 0 then raise exception 'O cliente conseguiu ler eventos administrativos privados.'; end if;
  begin
    perform 1 from public.listar_destaques_catalogo(200, 0);
  exception when insufficient_privilege then bloqueou := true;
  end;
  if not bloqueou then raise exception 'Uma conta sem perfil admin conseguiu consultar o ranking.'; end if;
  bloqueou := false;
  begin
    insert into private.visualizacoes_pecas (peca_id, abertura_id)
      values (current_setting('mimos.views_a')::uuid, gen_random_uuid());
  exception when insufficient_privilege then bloqueou := true;
  end;
  if not bloqueou then raise exception 'O cliente conseguiu escrever diretamente nos eventos.'; end if;
end;
$teste$;

select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mimos.views_admin'), 'role', 'authenticated')::text, true);
do $teste$
declare
  v_a uuid := current_setting('mimos.views_a')::uuid;
  v_b uuid := current_setting('mimos.views_b')::uuid;
  v_c uuid := current_setting('mimos.views_c')::uuid;
  anterior bigint;
  posterior bigint;
  ordenados uuid[];
  primeira_pagina uuid[];
  segundo uuid;
  bloqueou boolean := false;
begin
  if not public.eh_admin() then raise exception 'A conta administrativa não foi reconhecida.'; end if;
  select count(*) into anterior from private.visualizacoes_pecas where peca_id = v_a;
  if anterior <> 2 then raise exception 'O registro idempotente deveria ter exatamente duas aberturas.'; end if;
  if public.registrar_visualizacao_peca(v_a, gen_random_uuid()) is distinct from false then
    raise exception 'Uma navegação administrativa gerou interesse de cliente.';
  end if;
  select count(*) into posterior from private.visualizacoes_pecas where peca_id = v_a;
  if posterior <> anterior then raise exception 'A navegação administrativa alterou a contagem.'; end if;

  select array_agg(r.id order by r.ordinality) into primeira_pagina
    from public.listar_destaques_catalogo(200, 0) with ordinality as r;
  select array_agg(r.id order by r.ordinality) into ordenados
    from public.listar_destaques_catalogo(200, 0) with ordinality as r where r.id in (v_a, v_b, v_c);
  if ordenados is distinct from array[least(v_a, v_b), greatest(v_a, v_b)] then
    raise exception 'Empate por nome/UUID incorreto ou peça sem visualizações apareceu no ranking.';
  end if;
  if exists (select 1 from public.listar_destaques_catalogo(200, 0)
      where id in (current_setting('mimos.views_oculta')::uuid, current_setting('mimos.views_arquivada')::uuid)) then
    raise exception 'O ranking incluiu uma peça oculta ou arquivada.';
  end if;
  select id into segundo from public.listar_destaques_catalogo(1, 1);
  if segundo is distinct from primeira_pagina[2] then raise exception 'A paginação não preservou a ordem do ranking.'; end if;
  begin
    perform 1 from public.listar_destaques_catalogo(201, 0);
  exception when invalid_parameter_value then bloqueou := true;
  end;
  if not bloqueou then raise exception 'A RPC aceitou um tamanho de página inválido.'; end if;
end;
$teste$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $teste$
begin
  if not public.registrar_visualizacao_peca(current_setting('mimos.views_c')::uuid, gen_random_uuid())
    or not public.registrar_visualizacao_peca(current_setting('mimos.views_c')::uuid, gen_random_uuid()) then
    raise exception 'Não foi possível preparar o desempate por nome.';
  end if;
end;
$teste$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mimos.views_admin'), 'role', 'authenticated')::text, true);
do $teste$
declare
  v_a uuid := current_setting('mimos.views_a')::uuid;
  v_b uuid := current_setting('mimos.views_b')::uuid;
  v_c uuid := current_setting('mimos.views_c')::uuid;
  ordenados uuid[];
begin
  select array_agg(r.id order by r.ordinality) into ordenados
    from public.listar_destaques_catalogo(200, 0) with ordinality as r where r.id in (v_a, v_b, v_c);
  if ordenados is distinct from array[least(v_a, v_b), greatest(v_a, v_b), v_c] then
    raise exception 'Peças com a mesma contagem não foram desempatas por nome e UUID.';
  end if;
end;
$teste$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $teste$
begin
  if not public.registrar_visualizacao_peca(current_setting('mimos.views_c')::uuid, gen_random_uuid()) then
    raise exception 'Não foi possível preparar uma peça com mais visualizações.';
  end if;
end;
$teste$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('mimos.views_admin'), 'role', 'authenticated')::text, true);
do $teste$
declare
  v_a uuid := current_setting('mimos.views_a')::uuid;
  v_b uuid := current_setting('mimos.views_b')::uuid;
  v_c uuid := current_setting('mimos.views_c')::uuid;
  ordenados uuid[];
begin
  select array_agg(r.id order by r.ordinality) into ordenados
    from public.listar_destaques_catalogo(200, 0) with ordinality as r where r.id in (v_a, v_b, v_c);
  if ordenados is distinct from array[v_c, least(v_a, v_b), greatest(v_a, v_b)] then
    raise exception 'A ordem decrescente por visualizações não foi respeitada.';
  end if;
end;
$teste$;

reset role;
rollback;
select jsonb_build_object(
  'idempotencia', 'ok',
  'bloqueio_admin_e_permissoes', 'ok',
  'visibilidade_e_arquivamento', 'ok',
  'ordenacao_desempate_e_paginacao', 'ok',
  'dados_de_teste', 'revertidos com rollback'
) as verificacao;
