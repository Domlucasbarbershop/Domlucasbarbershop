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