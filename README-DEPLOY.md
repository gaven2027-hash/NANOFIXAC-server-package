# NANOFIXAC standalone server package

This repository and deployment package are exclusively for nanofixac.com. GitHub, Vercel, Supabase, source files and admin access are independent from NANOFIXSG.

## Upload

1. Deploy the contents of `public/` as the web root for `nanofixac.com`.
2. Keep the directory structure unchanged. The `/admin/` directory is the NANOFIXAC management backend.
3. `public/assets/supabase-config.js` is already configured for the independent NANOFIXAC Supabase project. Never add a service_role or secret key to this file.
4. Follow `SUPABASE-SETUP.md` when rebuilding the independent backend.

## Static hosting requirements

- HTTPS is required for the admin session and Supabase Auth.
- Serve `index.html` from directory routes such as `/services/` and `/admin/`.
- Do not expose the `source/` directory publicly. Deploy only `public/` as the web root.
- Add DNS records only after the independent Vercel hosting project is ready.

## Rebuild from source

From the `source/` directory:

```bash
npm install
npm run build
npm run check
```

The generated `source/dist/` directory can replace `public/` after checking the independent Supabase configuration.
