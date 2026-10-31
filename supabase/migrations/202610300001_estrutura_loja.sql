-- Migração da estrutura principal da loja Mimos da Taty:
-- Evolução de perfis + endereços, catálogo (categorias, peças e galeria),
-- pedidos, itens do pedido, pagamentos e bucket de fotos no Storage.

begin;

-- ============================================================================
-- 1. FUNÇÕES AUXILIARES (TIMESTAMP E VERIFICAÇÃO DE ADMIN SEM RECURSÃO RLS)
-- ============================================================================

create or replace function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.perfis
    where id = (select auth.uid())
      and perfil = 'admin'
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;

-- ============================================================================
-- 2. EVOLUÇÃO DE public.perfis (100% COMPATÍVEL COM CONTAS ATUAIS)
-- ============================================================================

alter table public.perfis
  add column if not exists nome_completo text,
  add column if not exists cpf char(11),
  add column if not exists telefone text,
  add column if not exists criado_em timestamptz not null default now(),
  add column if not exists atualizado_em timestamptz not null default now();

alter table public.perfis
  drop constraint if exists perfis_cpf_formato_check,
  add constraint perfis_cpf_formato_check
    check (cpf is null or cpf ~ '^[0-9]{11}$'),
  drop constraint if exists perfis_telefone_formato_check,
  add constraint perfis_telefone_formato_check
    check (telefone is null or telefone ~ '^[0-9]{10,11}$');

create unique index if not exists idx_perfis_cpf_unico
  on public.perfis (cpf)
  where cpf is not null;

drop trigger if exists trg_perfis_atualizado_em on public.perfis;
create trigger trg_perfis_atualizado_em
before update on public.perfis
for each row execute function public.definir_atualizado_em();

-- Atualiza o gatilho de criação de conta para capturar nome, CPF e telefone
-- quando enviados no signUp (limpando pontuação automaticamente).
create or replace function public.criar_perfil_nova_conta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
  v_cpf text;
  v_telefone text;
begin
  v_nome := nullif(btrim(coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name', '')), '');
  v_cpf := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '');
  v_telefone := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'telefone', ''), '\D', '', 'g'), '');

  insert into public.perfis (id, perfil, nome_completo, cpf, telefone)
  values (new.id, 'cliente', v_nome, v_cpf, v_telefone)
  on conflict (id) do update
    set nome_completo = coalesce(public.perfis.nome_completo, excluded.nome_completo),
        cpf = coalesce(public.perfis.cpf, excluded.cpf),
        telefone = coalesce(public.perfis.telefone, excluded.telefone);

  return new;
end;
$$;

revoke all on function public.criar_perfil_nova_conta() from public, anon, authenticated;

-- Preenche nome_completo nas contas já criadas anteriormente usando os metadados do Auth
update public.perfis p
set nome_completo = nullif(btrim(coalesce(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name', '')), '')
from auth.users u
where p.id = u.id
  and p.nome_completo is null;

-- Permissões de perfis: cliente só pode editar dados pessoais (nunca a coluna 'perfil'!)
grant select on table public.perfis to authenticated;
grant update (nome_completo, cpf, telefone) on table public.perfis to authenticated;

drop policy if exists "Consultar proprio perfil" on public.perfis;
create policy "Consultar proprio perfil" on public.perfis
for select to authenticated
using ((select auth.uid()) = id or public.eh_admin());

drop policy if exists "Atualizar proprio perfil" on public.perfis;
create policy "Atualizar proprio perfil" on public.perfis
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- ============================================================================
-- 3. ENDEREÇOS DO CLIENTE (public.enderecos_cliente)
-- ============================================================================

create table if not exists public.enderecos_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.perfis(id) on delete cascade,
  destinatario text not null check (char_length(btrim(destinatario)) >= 2),
  cep char(8) not null check (cep ~ '^[0-9]{8}$'),
  logradouro text not null check (char_length(btrim(logradouro)) >= 2),
  numero text not null check (char_length(btrim(numero)) >= 1),
  complemento text,
  bairro text not null check (char_length(btrim(bairro)) >= 2),
  cidade text not null check (char_length(btrim(cidade)) >= 2),
  uf char(2) not null check (uf ~ '^[A-Z]{2}$'),
  ponto_referencia text,
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_enderecos_cliente_id
  on public.enderecos_cliente (cliente_id);

-- Garante no máximo 1 endereço principal = true por cliente
create unique index if not exists idx_enderecos_principal_unico
  on public.enderecos_cliente (cliente_id)
  where principal = true;

drop trigger if exists trg_enderecos_atualizado_em on public.enderecos_cliente;
create trigger trg_enderecos_atualizado_em
before update on public.enderecos_cliente
for each row execute function public.definir_atualizado_em();

alter table public.enderecos_cliente enable row level security;
revoke all on table public.enderecos_cliente from anon, authenticated, public;
grant select, insert, update, delete on table public.enderecos_cliente to authenticated;

drop policy if exists "Gerenciar proprios enderecos" on public.enderecos_cliente;
create policy "Gerenciar proprios enderecos" on public.enderecos_cliente
for all to authenticated
using ((select auth.uid()) = cliente_id)
with check ((select auth.uid()) = cliente_id);

-- ============================================================================
-- 4. CATÁLOGO: CATEGORIAS, PEÇAS E FOTOS EXTRAS
-- ============================================================================

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(btrim(nome)) >= 2),
  ordem integer not null default 0,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.categorias enable row level security;
revoke all on table public.categorias from anon, authenticated, public;
grant select on table public.categorias to anon, authenticated;
grant insert, update, delete on table public.categorias to authenticated;

drop policy if exists "Ler categorias ativas ou admin" on public.categorias;
create policy "Ler categorias ativas ou admin" on public.categorias
for select to anon, authenticated
using (ativa = true or public.eh_admin());

drop policy if exists "Admin gerencia categorias" on public.categorias;
create policy "Admin gerencia categorias" on public.categorias
for all to authenticated
using (public.eh_admin())
with check (public.eh_admin());

-- Categorias iniciais já usadas no site
insert into public.categorias (nome, ordem, ativa)
values
  ('Maternidade', 1, true),
  ('Enxovais', 2, true),
  ('Crochê & Bordado', 3, true),
  ('Presentes', 4, true)
on conflict (nome) do nothing;

create table if not exists public.pecas (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) >= 2),
  descricao text,
  preco_centavos integer not null check (preco_centavos > 0),
  imagem_capa_url text not null check (char_length(btrim(imagem_capa_url)) > 0),
  tipo_disponibilidade text not null default 'sob_encomenda'
    check (tipo_disponibilidade in ('sob_encomenda', 'pronta_entrega')),
  estoque_atual integer
    check (
      (tipo_disponibilidade = 'sob_encomenda' and (estoque_atual is null or estoque_atual >= 0))
      or (tipo_disponibilidade = 'pronta_entrega' and estoque_atual is not null and estoque_atual >= 0)
    ),
  prazo_producao_dias integer not null default 7 check (prazo_producao_dias > 0),
  visivel boolean not null default true,
  arquivada boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_pecas_vitrine
  on public.pecas (visivel, arquivada, categoria_id);

drop trigger if exists trg_pecas_atualizado_em on public.pecas;
create trigger trg_pecas_atualizado_em
before update on public.pecas
for each row execute function public.definir_atualizado_em();

alter table public.pecas enable row level security;
revoke all on table public.pecas from anon, authenticated, public;
grant select on table public.pecas to anon, authenticated;
grant insert, update, delete on table public.pecas to authenticated;

drop policy if exists "Ler pecas visiveis ou admin" on public.pecas;
create policy "Ler pecas visiveis ou admin" on public.pecas
for select to anon, authenticated
using ((visivel = true and arquivada = false) or public.eh_admin());

drop policy if exists "Admin gerencia pecas" on public.pecas;
create policy "Admin gerencia pecas" on public.pecas
for all to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create table if not exists public.peca_imagens (
  id uuid primary key default gen_random_uuid(),
  peca_id uuid not null references public.pecas(id) on delete cascade,
  imagem_url text not null check (char_length(btrim(imagem_url)) > 0),
  ordem integer not null default 1 check (ordem >= 1),
  criado_em timestamptz not null default now()
);

create index if not exists idx_peca_imagens_peca
  on public.peca_imagens (peca_id, ordem);

alter table public.peca_imagens enable row level security;
revoke all on table public.peca_imagens from anon, authenticated, public;
grant select on table public.peca_imagens to anon, authenticated;
grant insert, update, delete on table public.peca_imagens to authenticated;

drop policy if exists "Ler fotos extras de pecas visiveis" on public.peca_imagens;
create policy "Ler fotos extras de pecas visiveis" on public.peca_imagens
for select to anon, authenticated
using (
  public.eh_admin()
  or exists (
    select 1 from public.pecas p
    where p.id = peca_id and p.visivel = true and p.arquivada = false
  )
);

drop policy if exists "Admin gerencia fotos extras" on public.peca_imagens;
create policy "Admin gerencia fotos extras" on public.peca_imagens
for all to authenticated
using (public.eh_admin())
with check (public.eh_admin());

-- ============================================================================
-- 5. PEDIDOS E ITENS DO PEDIDO
-- ============================================================================

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pedido bigint generated by default as identity (start with 1001) not null unique,
  cliente_id uuid not null references public.perfis(id) on delete restrict,
  status_pedido text not null default 'novo'
    check (status_pedido in ('novo', 'em_producao', 'enviado', 'entregue', 'cancelado')),
  status_pagamento text not null default 'pendente'
    check (status_pagamento in ('pendente', 'aprovado', 'recusado', 'cancelado', 'estornado')),
  forma_pagamento text not null
    check (forma_pagamento in ('pix', 'cartao_credito', 'cartao_debito')),
  subtotal_centavos integer not null check (subtotal_centavos > 0),
  frete_centavos integer not null default 0 check (frete_centavos >= 0),
  total_centavos integer not null check (total_centavos = subtotal_centavos + frete_centavos),
  modalidade_frete text,
  prazo_estimado_dias integer check (prazo_estimado_dias is null or prazo_estimado_dias > 0),

  -- Cópia congelada dos dados do cliente no momento da compra
  cliente_nome_snapshot text not null,
  cliente_email_snapshot text not null,
  cliente_cpf_snapshot char(11) not null check (cliente_cpf_snapshot ~ '^[0-9]{11}$'),
  cliente_telefone_snapshot text not null,

  -- Cópia congelada do endereço de entrega no momento da compra
  entrega_destinatario text not null,
  entrega_cep char(8) not null check (entrega_cep ~ '^[0-9]{8}$'),
  entrega_logradouro text not null,
  entrega_numero text not null,
  entrega_complemento text,
  entrega_bairro text not null,
  entrega_cidade text not null,
  entrega_uf char(2) not null check (entrega_uf ~ '^[A-Z]{2}$'),
  entrega_ponto_referencia text,

  observacao_cliente text,
  observacao_interna text,
  codigo_rastreio text,
  motivo_cancelamento text,

  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  enviado_em timestamptz,
  entregue_em timestamptz,
  cancelado_em timestamptz,
  atualizado_em timestamptz not null default now(),

  constraint pedidos_rastreio_obrigatorio_ao_enviar
    check (
      status_pedido not in ('enviado', 'entregue')
      or nullif(btrim(codigo_rastreio), '') is not null
    )
  );

create index if not exists idx_pedidos_cliente
  on public.pedidos (cliente_id, criado_em desc);

create index if not exists idx_pedidos_status
  on public.pedidos (status_pedido, criado_em desc);

-- Preenche datas automáticas ao mudar status do pedido
create or replace function public.atualizar_datas_status_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  if new.status_pedido = 'enviado' and old.status_pedido is distinct from 'enviado' and new.enviado_em is null then
    new.enviado_em := now();
  end if;
  if new.status_pedido = 'entregue' and old.status_pedido is distinct from 'entregue' and new.entregue_em is null then
    new.entregue_em := now();
  end if;
  if new.status_pedido = 'cancelado' and old.status_pedido is distinct from 'cancelado' and new.cancelado_em is null then
    new.cancelado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pedidos_datas_status on public.pedidos;
create trigger trg_pedidos_datas_status
before update on public.pedidos
for each row execute function public.atualizar_datas_status_pedido();

alter table public.pedidos enable row level security;
revoke all on table public.pedidos from anon, authenticated, public;
grant select on table public.pedidos to authenticated;
grant update on table public.pedidos to authenticated;

drop policy if exists "Cliente le proprios pedidos ou admin le todos" on public.pedidos;
create policy "Cliente le proprios pedidos ou admin le todos" on public.pedidos
for select to authenticated
using ((select auth.uid()) = cliente_id or public.eh_admin());

drop policy if exists "Apenas admin atualiza pedidos" on public.pedidos;
create policy "Apenas admin atualiza pedidos" on public.pedidos
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  peca_id uuid not null references public.pecas(id) on delete restrict,
  nome_peca_snapshot text not null,
  imagem_url_snapshot text not null,
  preco_unitario_centavos integer not null check (preco_unitario_centavos > 0),
  quantidade integer not null check (quantidade > 0),
  prazo_producao_dias_snapshot integer,
  personalizacao text
);

create index if not exists idx_itens_pedido_pedido
  on public.itens_pedido (pedido_id);

alter table public.itens_pedido enable row level security;
revoke all on table public.itens_pedido from anon, authenticated, public;
grant select on table public.itens_pedido to authenticated;

drop policy if exists "Cliente le itens dos proprios pedidos ou admin" on public.itens_pedido;
create policy "Cliente le itens dos proprios pedidos ou admin" on public.itens_pedido
for select to authenticated
using (
  public.eh_admin()
  or exists (
    select 1 from public.pedidos p
    where p.id = pedido_id and p.cliente_id = (select auth.uid())
  )
);

-- ============================================================================
-- 6. PAGAMENTOS (TENTATIVAS PIX / CARTÃO — PRONTA PARA MERCADO PAGO)
-- ============================================================================

create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete restrict,
  provedor text not null default 'simulacao'
    check (provedor in ('simulacao', 'mercado_pago', 'manual')),
  metodo text not null
    check (metodo in ('pix', 'cartao_credito', 'cartao_debito')),
  status text not null default 'pendente'
    check (status in ('pendente', 'em_processamento', 'aprovado', 'recusado', 'expirado', 'cancelado', 'estornado')),
  valor_centavos integer not null check (valor_centavos > 0),
  parcelas smallint not null default 1 check (parcelas >= 1 and parcelas <= 12),
  transacao_externa_id text unique,
  pix_copia_cola text,
  pix_expira_em timestamptz,
  detalhes_gateway jsonb,
  pago_em timestamptz,
  estornado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_pagamentos_pedido
  on public.pagamentos (pedido_id, criado_em desc);

-- Sincroniza status_pagamento e pago_em em public.pedidos quando um pagamento é aprovado/estornado
create or replace function public.sincronizar_pagamento_no_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'aprovado' then
    new.pago_em := coalesce(new.pago_em, now());
    update public.pedidos
      set status_pagamento = 'aprovado',
          pago_em = coalesce(pago_em, new.pago_em),
          atualizado_em = now()
      where id = new.pedido_id;
  elsif new.status = 'estornado' then
    new.estornado_em := coalesce(new.estornado_em, now());
    update public.pedidos
      set status_pagamento = 'estornado',
          atualizado_em = now()
      where id = new.pedido_id;
  elsif new.status in ('recusado', 'cancelado') then
    update public.pedidos
      set status_pagamento = new.status,
          atualizado_em = now()
      where id = new.pedido_id
        and status_pagamento not in ('aprovado', 'estornado');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pagamentos_atualizado_em on public.pagamentos;
create trigger trg_pagamentos_atualizado_em
before update on public.pagamentos
for each row execute function public.definir_atualizado_em();

drop trigger if exists trg_pagamentos_sincronizar on public.pagamentos;
create trigger trg_pagamentos_sincronizar
before insert or update of status on public.pagamentos
for each row execute function public.sincronizar_pagamento_no_pedido();

alter table public.pagamentos enable row level security;
revoke all on table public.pagamentos from anon, authenticated, public;
grant select on table public.pagamentos to authenticated;
grant insert, update on table public.pagamentos to authenticated;

drop policy if exists "Cliente le pagamentos dos proprios pedidos ou admin" on public.pagamentos;
create policy "Cliente le pagamentos dos proprios pedidos ou admin" on public.pagamentos
for select to authenticated
using (
  public.eh_admin()
  or exists (
    select 1 from public.pedidos p
    where p.id = pedido_id and p.cliente_id = (select auth.uid())
  )
);

drop policy if exists "Admin gerencia pagamentos" on public.pagamentos;
create policy "Admin gerencia pagamentos" on public.pagamentos
for all to authenticated
using (public.eh_admin())
with check (public.eh_admin());

-- ============================================================================
-- 7. FUNÇÃO SEGURA DE CHECKOUT (CALCULA PREÇOS OFICIAIS NO SERVIDOR)
-- ============================================================================

create or replace function public.criar_pedido(
  p_itens jsonb,
  p_endereco jsonb,
  p_forma_pagamento text,
  p_frete_centavos integer default 0,
  p_modalidade_frete text default null,
  p_observacao_cliente text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente_id uuid := (select auth.uid());
  v_perfil record;
  v_email text;
  v_item jsonb;
  v_peca record;
  v_qtd integer;
  v_subtotal integer := 0;
  v_maior_prazo integer := 0;
  v_pedido_id uuid;
begin
  if v_cliente_id is null then
    raise exception 'Faça login para finalizar sua compra.';
  end if;

  select id, nome_completo, cpf, telefone
    into v_perfil
    from public.perfis
    where id = v_cliente_id;

  select email into v_email from auth.users where id = v_cliente_id;

  if v_perfil.nome_completo is null or v_perfil.cpf is null or v_perfil.telefone is null then
    raise exception 'Complete seu nome, CPF e telefone no perfil antes de finalizar o pedido.';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione pelo menos uma peça ao pedido.';
  end if;

  if coalesce(p_frete_centavos, -1) < 0 then
    raise exception 'Valor de frete inválido.';
  end if;

  -- Calcula subtotal oficial e valida estoque caso a peça seja pronta-entrega
  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_qtd := coalesce((v_item->>'quantidade')::integer, 0);
    if v_qtd <= 0 then
      raise exception 'Quantidade inválida para uma das peças.';
    end if;

    select * into v_peca
      from public.pecas
      where id = (v_item->>'peca_id')::uuid
        and visivel = true
        and arquivada = false
      for update;

    if not found then
      raise exception 'Uma das peças escolhidas não está mais disponível.';
    end if;

    if v_peca.tipo_disponibilidade = 'pronta_entrega' then
      if v_peca.estoque_atual < v_qtd then
        raise exception 'Estoque insuficiente para a peça %.', v_peca.nome;
      end if;
      update public.pecas
        set estoque_atual = estoque_atual - v_qtd
        where id = v_peca.id;
    end if;

    v_subtotal := v_subtotal + (v_peca.preco_centavos * v_qtd);
    v_maior_prazo := greatest(v_maior_prazo, v_peca.prazo_producao_dias);
  end loop;

  insert into public.pedidos (
    cliente_id,
    forma_pagamento,
    subtotal_centavos,
    frete_centavos,
    total_centavos,
    modalidade_frete,
    prazo_estimado_dias,
    cliente_nome_snapshot,
    cliente_email_snapshot,
    cliente_cpf_snapshot,
    cliente_telefone_snapshot,
    entrega_destinatario,
    entrega_cep,
    entrega_logradouro,
    entrega_numero,
    entrega_complemento,
    entrega_bairro,
    entrega_cidade,
    entrega_uf,
    entrega_ponto_referencia,
    observacao_cliente
  ) values (
    v_cliente_id,
    p_forma_pagamento,
    v_subtotal,
    p_frete_centavos,
    v_subtotal + p_frete_centavos,
    nullif(btrim(p_modalidade_frete), ''),
    case when v_maior_prazo > 0 then v_maior_prazo else null end,
    v_perfil.nome_completo,
    coalesce(v_email, ''),
    v_perfil.cpf,
    v_perfil.telefone,
    btrim(coalesce(p_endereco->>'destinatario', v_perfil.nome_completo)),
    regexp_replace(coalesce(p_endereco->>'cep', ''), '\D', '', 'g'),
    btrim(coalesce(p_endereco->>'logradouro', '')),
    btrim(coalesce(p_endereco->>'numero', '')),
    nullif(btrim(coalesce(p_endereco->>'complemento', '')), ''),
    btrim(coalesce(p_endereco->>'bairro', '')),
    btrim(coalesce(p_endereco->>'cidade', '')),
    upper(btrim(coalesce(p_endereco->>'uf', ''))),
    nullif(btrim(coalesce(p_endereco->>'ponto_referencia', '')), ''),
    nullif(btrim(coalesce(p_observacao_cliente, '')), '')
  )
  returning id into v_pedido_id;

  -- Insere os itens com snapshot congelado
  for v_item in select * from jsonb_array_elements(p_itens) loop
    select * into v_peca from public.pecas where id = (v_item->>'peca_id')::uuid;
    insert into public.itens_pedido (
      pedido_id,
      peca_id,
      nome_peca_snapshot,
      imagem_url_snapshot,
      preco_unitario_centavos,
      quantidade,
      prazo_producao_dias_snapshot,
      personalizacao
    ) values (
      v_pedido_id,
      v_peca.id,
      v_peca.nome,
      v_peca.imagem_capa_url,
      v_peca.preco_centavos,
      (v_item->>'quantidade')::integer,
      v_peca.prazo_producao_dias,
      nullif(btrim(coalesce(v_item->>'personalizacao', '')), '')
    );
  end loop;

  -- Registra automaticamente a tentativa inicial de pagamento pendente do pedido
  insert into public.pagamentos (
    pedido_id,
    provedor,
    metodo,
    status,
    valor_centavos,
    parcelas
  ) values (
    v_pedido_id,
    'simulacao',
    p_forma_pagamento,
    'pendente',
    v_subtotal + p_frete_centavos,
    1
  );

  return v_pedido_id;
end;
$$;

revoke all on function public.criar_pedido(jsonb, jsonb, text, integer, text, text) from public, anon;
grant execute on function public.criar_pedido(jsonb, jsonb, text, integer, text, text) to authenticated;

-- ============================================================================
-- 8. BUCKET DE FOTOS DO CATÁLOGO NO SUPABASE STORAGE ('pecas')
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pecas',
  'pecas',
  true,
  5242880, -- 5 MB por imagem
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Leitura publica das fotos das pecas" on storage.objects;
create policy "Leitura publica das fotos das pecas" on storage.objects
for select to anon, authenticated
using (bucket_id = 'pecas');

drop policy if exists "Admin envia fotos das pecas" on storage.objects;
create policy "Admin envia fotos das pecas" on storage.objects
for insert to authenticated
with check (bucket_id = 'pecas' and public.eh_admin());

drop policy if exists "Admin atualiza fotos das pecas" on storage.objects;
create policy "Admin atualiza fotos das pecas" on storage.objects
for update to authenticated
using (bucket_id = 'pecas' and public.eh_admin())
with check (bucket_id = 'pecas' and public.eh_admin());

drop policy if exists "Admin remove fotos das pecas" on storage.objects;
create policy "Admin remove fotos das pecas" on storage.objects
for delete to authenticated
using (bucket_id = 'pecas' and public.eh_admin());

commit;
