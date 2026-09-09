alter table public.profiles add column if not exists email text;
update public.profiles p
set email=u.email, updated_at=now()
from auth.users u
where u.id=p.auth_user_id and p.email is distinct from u.email;
