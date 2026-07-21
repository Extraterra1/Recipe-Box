create or replace function public.create_cookbook_for_current_user(
  requested_name text,
  requested_invite_code text
)
returns table(id uuid, name text, invite_code text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_cookbook public.cookbooks%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in before creating a household.';
  end if;

  insert into public.cookbooks (name, owner_id, invite_code)
  values (trim(requested_name), current_user_id, upper(trim(requested_invite_code)))
  returning * into created_cookbook;

  insert into public.cookbook_members (cookbook_id, user_id, role)
  values (created_cookbook.id, current_user_id, 'owner');

  return query
    select created_cookbook.id, created_cookbook.name, created_cookbook.invite_code, 'owner'::text;
end;
$$;

revoke all on function public.create_cookbook_for_current_user(text, text) from public;
grant execute on function public.create_cookbook_for_current_user(text, text) to authenticated;
