# AMS Production Deployment Guide

This project is production-ready for deployment on Vercel + Supabase.

## 1) Prepare Supabase

1. Open your Supabase project.
2. Go to **SQL Editor** and run the SQL from:
   - `supabase/schema.sql`
3. Ensure storage bucket exists:
   - `transaction-evidence`
   - If missing, the app can auto-create it on upload via server role key.

## 2) Required Environment Variables

Set these in Vercel Project Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `DATABASE_URL`

Use `.env.example` as template.

## 3) Deploy to Vercel

### Option A: Vercel Dashboard (recommended)

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, click **New Project**.
3. Import repository.
4. Add environment variables.
5. Click **Deploy**.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

When prompted, set project and environment variables.

## 4) Post-Deploy Checklist

1. Open `/api/health` and confirm `{ "ok": true }`.
2. Create a transaction in `/add-transaction`.
3. Upload evidence files and confirm they appear in `/evidence-viewer`.
4. Create move record in `/move-asset` and verify map link + location history.
5. Check dashboard numbers/charts in `/dashboard`.

## 5) Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` must remain server-side only.
- Do not expose service role key in client code.
- Rotate keys if accidentally leaked.

## 6) Performance & Reliability Notes

- Global search uses debounce and min-length query.
- Payloads and validation are hardened with Zod.
- File uploads enforce type and size restrictions.

---

If you need, add custom domain from Vercel Project Settings → Domains after first production deploy.
