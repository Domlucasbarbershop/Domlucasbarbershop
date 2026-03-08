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
