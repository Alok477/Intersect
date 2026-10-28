# Intersect

Intersect is a responsive social-discovery app built with React, Vite, and Supabase. Supabase provides authentication, profiles, connection requests, and shared messaging; the frontend is a static site.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` to connect a Supabase project. The browser uses the public anon/publishable key; never put a Supabase service-role key in a `VITE_` variable.

## Deploy to Vercel

1. In Vercel, import the project or deploy this folder with `npx vercel --prod`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Project Settings → Environment Variables** for Production (and Preview if needed). Redeploy after changing variables.
3. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) once.
4. In Supabase, enable Realtime for the `messages` and `channel_messages` tables.
5. In **Authentication → URL Configuration**, set the deployed Vercel URL as the Site URL and add it to the allowed redirect URLs.

The Vercel configuration builds with `npm run build`, serves `dist`, and falls back to `index.html` for client-side routes. Local environment files are excluded from deployment uploads.
