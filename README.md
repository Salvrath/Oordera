# Timpriskalkylator

Källkoden för timpriskalkylator.com.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS / shadcn-ui
- Supabase
- Stripe via Supabase Edge Functions

## Lokal utveckling

```bash
npm install
npm run dev
```

Skapa en lokal `.env` utifrån `.env.example`.

## Produktion

Frontend är avsedd att deployas separat från Lovable. Supabase-konfiguration, migrationer och Edge Functions finns i katalogen `supabase/`.

## Migrering

Projektet migrerades från Lovable den 6 oktober 2026. Lovable ska inte behövas för den fortsatta driften när frontend, Supabase och domän har flyttats färdigt.
