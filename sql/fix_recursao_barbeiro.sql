create or replace function public.sync_usuario_barbeiro()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.usuario_id is not null then
    update public.usuarios
    set nome = new.nome
    where id = new.usuario_id
      and nome is distinct from new.nome;
  end if;

  return new;
end;
$$;

create or replace function public.sync_usuario_para_barbeiro()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.perfil = 'barbeiro' then
    insert into public.barbeiros (usuario_id, nome, telefone, comissao_percentual)
    values (new.id, new.nome, null, 40)
    on conflict (usuario_id) do update
      set nome = excluded.nome
      where public.barbeiros.nome is distinct from excluded.nome;
  end if;

  return new;
end;
$$;
