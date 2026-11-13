-- Portal ao vivo para cenários e orçamento: o aviso (broadcast) agora também
-- sai de budget_quotes, scope_items, purchases, scenarios e scenario_items
-- (esta última sobe até o projeto pelo cenário). Antes essas tabelas só
-- chegavam ao portal pela conferência periódica. Ver OQ-30.

create or replace function public.notify_client_portal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_project uuid;
  v_template uuid;
  v_token uuid;
  v_payload jsonb;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_payload := jsonb_build_object('table', tg_table_name, 'op', tg_op);

  -- Modelos de onboarding valem para todas as obras do time.
  if tg_table_name in ('onboarding_sections', 'onboarding_templates') then
    v_template := case when tg_table_name = 'onboarding_templates'
                       then nullif(v_row->>'id', '')::uuid
                       else nullif(v_row->>'template_id', '')::uuid end;
    if v_template is null then
      return null;
    end if;
    for v_token in
      select distinct t.token
        from public.onboarding_templates ot
        join public.team_members tm on tm.team_id = ot.team_id
        join public.projects p on p.user_id = tm.user_id
        join public.client_portal_tokens t on t.project_id = p.id and t.is_active
       where ot.id = v_template
    loop
      begin
        perform realtime.send(v_payload, 'portal_changed', 'portal:' || v_token::text, false);
      exception when others then null;
      end;
    end loop;
    return null;
  end if;

  -- Nome do cliente aparece no portal de todas as obras dele.
  if tg_table_name = 'clients' then
    for v_token in
      select t.token
        from public.projects p
        join public.client_portal_tokens t on t.project_id = p.id and t.is_active
       where p.client_id = nullif(v_row->>'id', '')::uuid
    loop
      begin
        perform realtime.send(v_payload, 'portal_changed', 'portal:' || v_token::text, false);
      exception when others then null;
      end;
    end loop;
    return null;
  end if;

  -- Itens de cenário não têm project_id: sobe pelo cenário.
  if tg_table_name = 'scenario_items' then
    select s.project_id into v_project from public.scenarios s
     where s.id = nullif(v_row->>'scenario_id', '')::uuid;
  else
  v_project := case when tg_table_name = 'projects'
                    then nullif(v_row->>'id', '')::uuid
                    else nullif(v_row->>'project_id', '')::uuid end;
  end if;
  if v_project is null then
    return null;
  end if;

  for v_token in
    select t.token from public.client_portal_tokens t where t.project_id = v_project and t.is_active
  loop
    begin
      perform realtime.send(v_payload, 'portal_changed', 'portal:' || v_token::text, false);
    exception when others then null;
    end;
  end loop;
  return null;
exception when others then
  -- Nunca impede a gravação por causa do aviso ao portal.
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'budget_quotes', 'scope_items', 'purchases', 'scenarios', 'scenario_items'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_notify_client_portal on public.%I', t);
      execute format(
        'create trigger trg_notify_client_portal after insert or update or delete on public.%I '
        'for each row execute function public.notify_client_portal_change()',
        t
      );
    end if;
  end loop;
end;
$$;
