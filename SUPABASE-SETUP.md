# NANOFIXAC separate backend setup

Create a new Supabase project for NANOFIXAC. Do not reuse the NANOFIXSG project.

1. Create the separate project and record its project URL and publishable key.
2. Run the SQL files in `source/supabase/migrations/` in filename order.
3. Create the administrator in Supabase Auth with email `nanofixac@gmail.com` and the owner-selected initial password.
4. Create or approve the matching `public.profiles` row with role `super_admin` and `is_active = true`.
5. Put the new project URL and publishable key in `public/assets/supabase-config.js`.
6. Test the public enquiry form and `/admin/` login over HTTPS.

The browser bundle must contain only the publishable key. Never put a Supabase secret or service-role key in `public/`.

