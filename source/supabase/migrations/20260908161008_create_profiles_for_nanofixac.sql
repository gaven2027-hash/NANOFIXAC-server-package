create table if not exists public.profiles (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'support' check (role in ('super_admin','operations_admin','support','content_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
create policy profiles_self_read on public.profiles for select to authenticated using (auth_user_id=(select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (auth_user_id=(select auth.uid())) with check (auth_user_id=(select auth.uid()));
