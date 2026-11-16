-- Uma visualização representa uma abertura dos detalhes, não uma pessoa única.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table private.visualizacoes_pecas (
  peca_id uuid not null references public.pecas(id) on delete cascade,
  abertura_id uuid not null,
  criado_em timestamptz not null default now(),
  primary key (peca_id, abertura_id)
);
alter table private.visualizacoes_pecas enable row level security;
revoke all on table private.visualizacoes_pecas from public, anon, authenticated;
grant select on table private.visualizacoes_pecas to authenticated;
create policy "Administradores consultam visualizacoes"
  on private.visualizacoes_pecas for select to authenticated
  using ((select auth.uid()) is not null and (select public.eh_admin()));

-- O helper privado é o único caminho de escrita. Não recebe perfil pelo cliente.
create function private.registrar_visualizacao_peca(p_peca_id uuid, p_abertura_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare inseridas integer;
begin
  if p_peca_id is null or p_abertura_id is null or public.eh_admin() then
    return false;
  end if;
  insert into private.visualizacoes_pecas (peca_id, abertura_id)
    select p.id, p_abertura_id
    from public.pecas as p
    where p.id = p_peca_id and p.visivel and not p.arquivada
    on conflict (peca_id, abertura_id) do nothing;
  get diagnostics inseridas = row_count;
  return inseridas = 1;
end;
$$;
revoke all on function private.registrar_visualizacao_peca(uuid, uuid) from public, anon, authenticated;
grant execute on function private.registrar_visualizacao_peca(uuid, uuid) to anon, authenticated;

create function public.registrar_visualizacao_peca(p_peca_id uuid, p_abertura_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.registrar_visualizacao_peca(p_peca_id, p_abertura_id);
$$;
revoke all on function public.registrar_visualizacao_peca(uuid, uuid) from public, anon, authenticated;
grant execute on function public.registrar_visualizacao_peca(uuid, uuid) to anon, authenticated;

create function public.listar_destaques_catalogo(p_limite integer default 200, p_offset integer default 0)
returns table (
  id uuid,
  nome text,
  descricao text,
  preco_centavos integer,
  imagem_capa_url text,
  categoria text,
  prazo_producao_dias integer,
  visualizacoes bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.eh_admin() then
    raise exception using errcode = '42501', message = 'Somente administradores podem consultar os destaques.';
  end if;
  if p_limite is null or p_limite < 1 or p_limite > 200 or p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'Paginação inválida para os destaques.';
  end if;
  return query
    select p.id, p.nome, p.descricao, p.preco_centavos, p.imagem_capa_url,
           coalesce(c.nome, ''), p.prazo_producao_dias, count(v.abertura_id)
    from public.pecas as p
    join private.visualizacoes_pecas as v on v.peca_id = p.id
    left join public.categorias as c on c.id = p.categoria_id
    where p.visivel and not p.arquivada
    group by p.id, p.nome, p.descricao, p.preco_centavos, p.imagem_capa_url,
             c.nome, p.prazo_producao_dias
    order by count(v.abertura_id) desc, p.nome asc, p.id asc
    limit p_limite offset p_offset;
end;
$$;
revoke all on function public.listar_destaques_catalogo(integer, integer) from public, anon, authenticated;
grant execute on function public.listar_destaques_catalogo(integer, integer) to authenticated;

comment on table private.visualizacoes_pecas is 'Aberturas idempotentes por peça e navegação, sem dados pessoais do visitante.';
comment on function public.listar_destaques_catalogo(integer, integer) is 'Ranking administrativo: visualizações DESC, nome ASC, UUID ASC; somente peças visíveis e não arquivadas.';
notify pgrst, 'reload schema';
