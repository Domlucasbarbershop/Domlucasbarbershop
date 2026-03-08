-- 1) Nao listar admin como barbeiro nas telas de agendamento/filtros
create or replace function public.listar_barbeiros_publico()
returns table (
  id uuid,
  nome text
)
language sql
security definer
set search_path = public
as $$
  select b.id, b.nome
  from public.barbeiros b
  left join public.usuarios u on u.id = b.usuario_id
  where coalesce(u.perfil, 'barbeiro') <> 'admin'
  order by b.nome;
$$;

-- 2) Opcional (recomendado): remover registros de barbeiro vinculados a admins ja existentes
delete from public.barbeiros b
using public.usuarios u
where b.usuario_id = u.id
  and u.perfil = 'admin';
