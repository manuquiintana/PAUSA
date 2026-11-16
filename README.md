# Pausa — MVP de bienestar laboral (B2B)

> Tu bienestar también forma parte de tu jornada laboral.

Las decisiones de producto, privacidad y stack están en `CLAUDE.md` (en el proyecto de Claude).

## Arrancar en local

```bash
npm install
cp .env.example .env.local   # sin rellenar → arranca en modo demo
npm run dev
```

### Modo demo
Si no hay credenciales de Supabase (o `VITE_DATA_BACKEND=demo`), la app usa **PGlite**: un Postgres real
dentro del navegador que ejecuta las mismas migraciones, políticas RLS y funciones de agregados que Supabase,
con datos de ejemplo. Se entra eligiendo un usuario demo. Los cambios se pierden al recargar.

`npm run build:demo` genera un build estático del modo demo (sin service worker) para enseñarlo.

### Conectar Supabase
1. Crea un proyecto en Supabase y copia `URL` y `anon key` a `.env.local`.
2. En el SQL Editor, ejecuta en orden los archivos de `supabase/migrations/`.
3. (Opcional, solo en un proyecto de pruebas) ejecuta en orden `supabase/seed/01_auth_users.sql`,
   `02_demo_data.sql` y `03_demo_pauses.sql`. Usuarios: `ana@demo-logistica.es`, `carlos@…`, `irene@…`, `lucia@…`,
   contraseña `PausaDemo2026!`.

## Comandos
- `npm run dev` — desarrollo
- `npm run test` — tests de lógica (Vitest)
- `npm run lint` — lint
- `npm run test:rls` — verifica las reglas de privacidad con usuarios de cada rol (PGlite + migraciones reales)

## Estructura
- `supabase/migrations/` — esquema, RLS y funciones `security definer` de agregados
- `supabase/seed/` — datos de ejemplo
- `src/lib/suggest.ts` — sugerencia de pausa y horas de pausa (con tests)
- `src/lib/player.ts` — lógica del reproductor (pasos, respiración) (con tests)
- `supabase/pglite/` — réplica mínima de `auth` de Supabase para demo y tests
- `src/lib/backend/` — capa de datos: `supabase.ts` (real) y `demo.ts` (PGlite)
- `scripts/test-rls.ts` — pruebas de privacidad
