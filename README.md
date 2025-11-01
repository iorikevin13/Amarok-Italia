# Amarok Italia - Starter

Questo repository contiene un progetto starter per l'app **Amarok Italia** (React + Supabase).

## Setup rapido (locale)

1. Installa Node.js (16+), poi:
```bash
npm install
```

2. Crea un progetto su Supabase, copia URL e ANON KEY e incollali in `.env` (usa `.env.example` come riferimento).

3. Crea le tabelle eseguendo `sql/db_setup.sql` nello SQL editor di Supabase.

4. Crea un bucket Storage chiamato `public`.

5. Avvia in locale:
```bash
npm run dev
```

## Deploy
Vercel o Netlify funzionano bene. Imposta le env vars `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## File importanti
- `src/App.jsx` - codice principale React (single-file app)
- `public/manifest.json` - PWA manifest
- `public/service-worker.js` - service worker minimal
- `sql/db_setup.sql` - script SQL per creare tabelle e policies RLS
