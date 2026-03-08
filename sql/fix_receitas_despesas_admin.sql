create table if not exists public.receitas_manuais (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text,
  valor numeric(12,2) not null check (valor >= 0),
  data date not null,
  status_pagamento text not null default 'pago' check (status_pagamento in ('pago','pendente')),
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_receitas_manuais_data on public.receitas_manuais(data);

alter table public.receitas_manuais enable row level security;

drop policy if exists receitas_manuais_select_admin on public.receitas_manuais;
create policy receitas_manuais_select_admin on public.receitas_manuais
for select using (public.fn_is_admin());

drop policy if exists receitas_manuais_write_admin on public.receitas_manuais;
create policy receitas_manuais_write_admin on public.receitas_manuais
for all using (public.fn_is_admin())
with check (public.fn_is_admin());

create table if not exists public.contas_receber_manuais (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text,
  valor numeric(12,2) not null check (valor >= 0),
  data date not null,
  status text not null default 'pendente' check (status in ('pendente','recebido')),
  data_recebimento date,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_contas_receber_manuais_data on public.contas_receber_manuais(data);
create index if not exists idx_contas_receber_manuais_status on public.contas_receber_manuais(status);

alter table public.contas_receber_manuais enable row level security;

drop policy if exists contas_receber_manuais_select_admin on public.contas_receber_manuais;
create policy contas_receber_manuais_select_admin on public.contas_receber_manuais
for select using (public.fn_is_admin());

drop policy if exists contas_receber_manuais_write_admin on public.contas_receber_manuais;
create policy contas_receber_manuais_write_admin on public.contas_receber_manuais
for all using (public.fn_is_admin())
with check (public.fn_is_admin());

create table if not exists public.categorias_despesa (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

alter table public.categorias_despesa enable row level security;

drop policy if exists categorias_despesa_select_admin on public.categorias_despesa;
create policy categorias_despesa_select_admin on public.categorias_despesa
for select using (public.fn_is_admin());

drop policy if exists categorias_despesa_write_admin on public.categorias_despesa;
create policy categorias_despesa_write_admin on public.categorias_despesa
for all using (public.fn_is_admin())
with check (public.fn_is_admin());

create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text,
  valor numeric(12,2) not null check (valor >= 0),
  data date not null,
  observacao text,
  created_at timestamptz not null default now()
);

create index if not exists idx_despesas_data on public.despesas(data);

alter table public.despesas enable row level security;

drop policy if exists despesas_select_admin on public.despesas;
create policy despesas_select_admin on public.despesas
for select using (public.fn_is_admin());

drop policy if exists despesas_write_admin on public.despesas;
create policy despesas_write_admin on public.despesas
for all using (public.fn_is_admin())
with check (public.fn_is_admin());
