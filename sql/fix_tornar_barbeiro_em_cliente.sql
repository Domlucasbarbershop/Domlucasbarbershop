create or replace function public.definir_usuario_como_cliente(
  p_usuario_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select public.fn_is_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Apenas admin pode definir cliente';
  end if;

  update public.usuarios
  set perfil = case when perfil = 'admin' then 'admin' else 'cliente' end
  where id = p_usuario_id;

  if not found then
    raise exception 'Usuario nao encontrado';
  end if;

  update public.barbeiros
  set usuario_id = null
  where usuario_id = p_usuario_id;

  return true;
end;
$$;

grant execute on function public.definir_usuario_como_cliente(uuid) to authenticated;
