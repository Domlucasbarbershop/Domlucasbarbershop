create or replace function public.fn_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.perfil = 'admin'
      and u.ativo = true
  );
$$;

create or replace function public.fn_is_barbeiro()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.perfil = 'barbeiro'
      and u.ativo = true
  );
$$;

create or replace function public.fn_meu_barbeiro_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id
  from public.barbeiros b
  where b.usuario_id = auth.uid()
  limit 1;
$$;
