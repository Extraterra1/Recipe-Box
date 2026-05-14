create extension if not exists pgcrypto;

create table if not exists public.cookbooks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique check (char_length(invite_code) between 6 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cookbook_members (
  cookbook_id uuid not null references public.cookbooks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (cookbook_id, user_id)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  cookbook_id uuid not null references public.cookbooks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  source_label text,
  source_url text,
  metadata text,
  ingredients text[] not null default '{}',
  directions text[] not null default '{}',
  notes text[] not null default '{}',
  nutrition text[] not null default '{}',
  tags text[] not null default '{}',
  favorite boolean not null default false,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cookbook_id, title)
);

create index if not exists cookbook_members_user_id_idx on public.cookbook_members(user_id);
create index if not exists recipes_cookbook_id_title_idx on public.recipes(cookbook_id, title);
create index if not exists recipes_tags_idx on public.recipes using gin(tags);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cookbooks_set_updated_at on public.cookbooks;
create trigger cookbooks_set_updated_at
before update on public.cookbooks
for each row execute function public.set_updated_at();

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

alter table public.cookbooks enable row level security;
alter table public.cookbook_members enable row level security;
alter table public.recipes enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.cookbooks to authenticated;
grant select, insert, update, delete on public.cookbook_members to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;

create policy "members can read their cookbooks"
on public.cookbooks for select
to authenticated
using (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = cookbooks.id
      and cookbook_members.user_id = (select auth.uid())
  )
);

create policy "authenticated users can create owned cookbooks"
on public.cookbooks for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "owners can update cookbooks"
on public.cookbooks for update
to authenticated
using (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = cookbooks.id
      and cookbook_members.user_id = (select auth.uid())
      and cookbook_members.role = 'owner'
  )
)
with check (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = cookbooks.id
      and cookbook_members.user_id = (select auth.uid())
      and cookbook_members.role = 'owner'
  )
);

create policy "members can read cookbook members"
on public.cookbook_members for select
to authenticated
using (user_id = (select auth.uid()));

create policy "owners can create their owner membership"
on public.cookbook_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'owner'
  and
  exists (
    select 1 from public.cookbooks
    where cookbooks.id = cookbook_members.cookbook_id
      and cookbooks.owner_id = (select auth.uid())
  )
);

create or replace function public.join_cookbook_by_invite(requested_invite_code text)
returns table(id uuid, name text, invite_code text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_cookbook public.cookbooks%rowtype;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in before joining a household.';
  end if;

  select *
    into target_cookbook
  from public.cookbooks
  where cookbooks.invite_code = upper(trim(requested_invite_code))
  limit 1;

  if target_cookbook.id is null then
    raise exception 'Invite code was not found.';
  end if;

  insert into public.cookbook_members (cookbook_id, user_id, role)
  values (target_cookbook.id, current_user_id, 'editor')
  on conflict (cookbook_id, user_id) do update
    set role = public.cookbook_members.role;

  return query
    select target_cookbook.id, target_cookbook.name, target_cookbook.invite_code, 'editor'::text;
end;
$$;

revoke all on function public.join_cookbook_by_invite(text) from public;
grant execute on function public.join_cookbook_by_invite(text) to authenticated;

create policy "members can read recipes"
on public.recipes for select
to authenticated
using (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = recipes.cookbook_id
      and cookbook_members.user_id = (select auth.uid())
  )
);

create policy "members can insert recipes"
on public.recipes for insert
to authenticated
with check (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = recipes.cookbook_id
      and cookbook_members.user_id = (select auth.uid())
      and cookbook_members.role in ('owner', 'editor')
  )
);

create policy "members can update recipes"
on public.recipes for update
to authenticated
using (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = recipes.cookbook_id
      and cookbook_members.user_id = (select auth.uid())
      and cookbook_members.role in ('owner', 'editor')
  )
)
with check (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = recipes.cookbook_id
      and cookbook_members.user_id = (select auth.uid())
      and cookbook_members.role in ('owner', 'editor')
  )
);

create policy "members can delete recipes"
on public.recipes for delete
to authenticated
using (
  exists (
    select 1 from public.cookbook_members
    where cookbook_members.cookbook_id = recipes.cookbook_id
      and cookbook_members.user_id = (select auth.uid())
      and cookbook_members.role in ('owner', 'editor')
  )
);
