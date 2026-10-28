-- Reproduz a estrutura de perfis configurada no tutorial, preservando contas existentes.
begin;

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  perfil text not null default 'cliente' check (perfil in ('cliente', 'admin'))
);

alter table public.perfis enable row level security;
revoke all on table public.perfis from anon, authenticated, public;
grant select on table public.perfis to authenticated;

drop policy if exists "Consultar proprio perfil" on public.perfis;
create policy "Consultar proprio perfil" on public.perfis
for select to authenticated
using ((select auth.uid()) = id);

create or replace function public.criar_perfil_nova_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, perfil) values (new.id, 'cliente');
  return new;
end;
$$;

revoke all on function public.criar_perfil_nova_conta() from public, anon, authenticated;
drop trigger if exists ao_criar_conta on auth.users;
create trigger ao_criar_conta after insert on auth.users
for each row execute function public.criar_perfil_nova_conta();

insert into public.perfis (id)
select id from auth.users
on conflict (id) do nothing;

commit;
