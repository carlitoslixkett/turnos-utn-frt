# Turnos UTN FRT

Sistema de gestión de turnos del Departamento de Alumnos — Universidad Tecnológica Nacional, Facultad Regional Tucumán.

## Stack

- **Frontend:** Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Next.js Route Handlers + Server Actions
- **Base de datos:** Supabase (PostgreSQL) con RLS activo
- **Auth:** Supabase Auth con verificación de email
- **PWA:** @serwist/next — instalable en desktop y mobile
- **Deploy:** Vercel (frontend + API) + Supabase managed

## Setup local

```bash
# 1. Clonar el repo
git clone https://github.com/carlitoslixkett/turnos-utn-frt.git
cd turnos-utn-frt

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Completar con los valores de Supabase

# 4. Correr migraciones (requiere Supabase CLI)
npx supabase db push

# 5. Levantar la app
npm run dev
```

## Comandos

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run test         # Tests unitarios (Vitest)
npm run test:e2e     # Tests E2E (Playwright)
```

## Estructura

```
src/
  app/
    (auth)/          # login, registro, verificación
    (student)/       # home, sacar-turno, mis-turnos, noticias
    (worker)/        # atender, notas, intervalos, noticias-admin
    (admin)/         # workers, métricas
    api/             # route handlers
  components/        # ui, forms, features por dominio
  lib/               # supabase, validations, auth, utils
  types/             # TypeScript types
tests/
  unit/
  integration/
  e2e/              # Playwright
supabase/
  migrations/        # SQL con timestamps
  functions/         # Edge Functions (cron noticias, emails)
  seed.sql
```

## Fases

| Fase | Estado | Descripción                                         |
| ---- | ------ | --------------------------------------------------- |
| -1   | ✅     | Skill superpowers instalada                         |
| 0    | ✅     | Setup: repo, Next.js, TS, Tailwind, Supabase, CI/CD |
| 1    | 🔄     | Schema DB, RLS, seed, auth                          |
| 2    | ⏳     | CRUDs base: Notes, Intervals, News                  |
| 3    | ⏳     | Flujos core Student: turnos                         |
| 4    | ⏳     | Atención de turnos (Worker)                         |
| 5    | ⏳     | Gestión de Workers (admin)                          |
| 6    | ⏳     | PWA completa                                        |
| 7    | ⏳     | Métricas / dashboard analítico                      |
| 8    | ⏳     | Hardening: rate limit, headers, pentest             |
| 9    | ⏳     | Deploy producción                                   |

## Usuarios del sistema

- **Student:** alumnos UTN FRT (`@frt.utn.edu.ar`)
- **Worker:** personal del Departamento de Alumnos
- **Admin:** workers con rol admin (gestión de usuarios y métricas)
