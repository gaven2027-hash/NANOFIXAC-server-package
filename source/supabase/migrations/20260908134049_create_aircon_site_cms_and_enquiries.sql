create table if not exists public.aircon_site_enquiries (
  enquiry_id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  mobile text not null check (char_length(mobile) between 6 and 40),
  email text check (email is null or char_length(email) <= 254),
  postal_code text check (postal_code is null or char_length(postal_code) <= 12),
  property_type text check (property_type is null or char_length(property_type) <= 80),
  unit_count integer not null default 1 check (unit_count between 1 and 100),
  preferred_date date,
  details text check (details is null or char_length(details) <= 5000),
  locale text not null default 'en' check (locale in ('en','zh')),
  source text not null default 'nanofixac_website',
  status text not null default 'new' check (status in ('new','contacted','quoted','closed','spam')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 5000),
  replied_at timestamptz,
  reply_channel text check (reply_channel is null or reply_channel in ('whatsapp','email','phone'))
);

create index if not exists aircon_site_enquiries_created_at_idx on public.aircon_site_enquiries (created_at desc);
create index if not exists aircon_site_enquiries_status_idx on public.aircon_site_enquiries (status, created_at desc);
alter table public.aircon_site_enquiries enable row level security;

create policy aircon_site_enquiries_public_insert on public.aircon_site_enquiries for insert to anon
with check (status='new' and source='nanofixac_website' and admin_notes is null and replied_at is null and reply_channel is null);

create policy aircon_site_enquiries_admin_all on public.aircon_site_enquiries for all to authenticated
using (exists (select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.is_active=true and p.role in ('super_admin','operations_admin','support','content_admin')))
with check (exists (select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.is_active=true and p.role in ('super_admin','operations_admin','support','content_admin')));

revoke all on table public.aircon_site_enquiries from anon, authenticated;
grant insert on table public.aircon_site_enquiries to anon;
grant select, insert, update, delete on table public.aircon_site_enquiries to authenticated;
grant all on table public.aircon_site_enquiries to service_role;

create table if not exists public.aircon_site_content (
  content_id uuid primary key default gen_random_uuid(),
  route text not null,
  locale text not null check (locale in ('en','zh')),
  hero_title text,
  hero_lead text,
  meta_description text,
  image_url text,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique(route,locale)
);

create index if not exists aircon_site_content_status_idx on public.aircon_site_content (status,locale,route);
alter table public.aircon_site_content enable row level security;
create policy aircon_site_content_public_read on public.aircon_site_content for select to anon using (status='published');
create policy aircon_site_content_admin_all on public.aircon_site_content for all to authenticated
using (exists (select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.is_active=true and p.role in ('super_admin','operations_admin','support','content_admin')))
with check (exists (select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.is_active=true and p.role in ('super_admin','operations_admin','support','content_admin')));
revoke all on table public.aircon_site_content from anon, authenticated;
grant select on table public.aircon_site_content to anon;
grant select, insert, update, delete on table public.aircon_site_content to authenticated;
grant all on table public.aircon_site_content to service_role;
