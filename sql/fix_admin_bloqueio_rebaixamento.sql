-- 1) Funcao principal: definir barbeiro sem rebaixar admin
create or replace function public.definir_usuario_como_barbeiro(
  p_usuario_id uuid,
  p_nome text,
  p_telefone text default null,
  p_comissao numeric default 40
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_barbeiro_id uuid;
begin
  select public.fn_is_admin() into v_is_admin;
  if not v_is_admin then
    raise exception 'Apenas admin pode definir barbeiro';
  end if;

  update public.usuarios
  set perfil = case when perfil = 'admin' then 'admin' else 'barbeiro' end,
      nome = coalesce(nullif(trim(coalesce(p_nome, '')), ''), nome)
  where id = p_usuario_id;

  if not found then
    raise exception 'Usuario nao encontrado';
  end if;

  insert into public.barbeiros (usuario_id, nome, telefone, comissao_percentual)
  values (
    p_usuario_id,
    coalesce(nullif(trim(coalesce(p_nome, '')), ''), 'Barbeiro'),
    nullif(trim(coalesce(p_telefone, '')), ''),
    coalesce(p_comissao, 40)
  )
  on conflict (usuario_id) do update
    set nome = excluded.nome,
        telefone = coalesce(excluded.telefone, public.barbeiros.telefone),
        comissao_percentual = excluded.comissao_percentual
  returning id into v_barbeiro_id;

  return v_barbeiro_id;
end;
$$;

-- 2) Blindagem: nunca permitir trocar admin para outro perfil
create or replace function public.proteger_perfil_admin()
returns trigger
language plpgsql
as $$
begin
  if old.perfil = 'admin' and new.perfil <> 'admin' then
    new.perfil := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_usuarios_proteger_admin on public.usuarios;
create trigger trg_usuarios_proteger_admin
before update of perfil on public.usuarios
for each row
execute function public.proteger_perfil_admin();

-- 3) RESTAURAR AGORA seu admin (troque pelo email do admin)
-- update public.usuarios
-- set perfil = 'admin', ativo = true
-- where email = 'SEU_EMAIL_ADMIN@EXEMPLO.COM';
