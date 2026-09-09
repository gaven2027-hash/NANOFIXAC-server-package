# NANOFIXAC standalone server package

This package is for `nanofixac.com` only. It is separate from the NANOFIXSG website, source files, database and admin workspace.

## Upload

1. Upload the contents of `public/` to the web server document root for `nanofixac.com`.
2. Keep the directory structure unchanged. The `/admin/` directory is the NANOFIXAC management backend.
3. Before public launch, replace `public/assets/supabase-config.js` with the URL and publishable key of the separate NANOFIXAC Supabase project. Never add a `service_role` or secret key to this file.
4. Follow `SUPABASE-SETUP.md` to initialise the separate backend and admin account.

## Static hosting requirements

- HTTPS is required for the admin session and Supabase Auth.
- The server must serve `index.html` from directory routes such as `/services/` and `/admin/`.
- Do not expose the `source/` directory publicly. Upload only `public/` as the web root.
- Add the supplied domain DNS records only after the new NANOFIXAC hosting project or server is ready.

## Rebuild from source

The `source/` folder contains the generator, content, migrations and admin assets. From that folder:

```bash
npm install
npm run build
npm run check
```

The generated `source/dist/` directory can replace `public/` after the separate Supabase config has been applied.

