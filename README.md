# City Pulse

## Run locally

```bash
npm install
npm run dev
```

## Supabase connection

1. Copy `.env.example` to `.env` and fill:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
2. In Supabase SQL editor, run:
`supabase/schema.sql`
3. Restart the dev server.

After setup, timeline state syncs to Supabase table `app_states` (row id: `timeline`), with local storage as fallback.
