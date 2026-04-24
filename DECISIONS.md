# Decisiones técnicas

Registro de decisiones tomadas durante el desarrollo sin consulta explícita al usuario.

---

## 2026-04-23 — Stack PWA: `@serwist/next` en lugar de `next-pwa`

**Decisión:** Usar `@serwist/next` (fork activo mantenido) en vez de `next-pwa`.

**Motivo:** `next-pwa` ≥2.1.0 depende de `workbox-webpack-plugin` que a su vez usa `serialize-javascript` con 5 vulnerabilidades High CVE (GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v). `@serwist/next` es el sucesor oficial recomendado, cero vulnerabilidades, API equivalente.

---

## 2026-04-23 — Hashing de security codes: `bcryptjs` en lugar de `argon2`

**Decisión:** Usar `bcryptjs` (implementación JS pura) en vez de `argon2` (bindings C++).

**Motivo:** `argon2` requiere compilación nativa. Vercel Serverless Functions no garantiza soporte para binarios nativos en todos los runtimes. `bcryptjs` es 100% JS, sin dependencias nativas, suficientemente seguro para security codes de 6 dígitos con salt rounds=12.

---

## 2026-04-23 — Nombre del repositorio: `turnos-utn-frt`

**Motivo:** Describe el dominio (turnos), la institución (UTN) y la sede (FRT). Corto, descriptivo, sin espacios.

---

## 2026-04-23 — Duración default de turno: 15 minutos

**Motivo:** Valor sugerido en el prompt. Configurable por intervalo.

---

## 2026-04-23 — Intentos fallidos para bloqueo de cancelación: N=3

**Motivo:** Valor especificado en el prompt.

---

## 2026-04-23 — Regla de cancelación: 3 días de anticipación

**Motivo:** Regla de negocio explícita del prompt. Calcula con `date-fns/differenceInDays`.

---

## 2026-04-23 — Rate limiting: Upstash Redis (serverless-compatible)

**Motivo:** Vercel Serverless no permite estado en memoria entre invocaciones. Upstash es el estándar de-facto para rate limiting serverless.

---

## 2026-04-23 — Email de dominio institucional: parametrizable via env `ALLOWED_EMAIL_DOMAINS`

**Motivo:** El prompt lo especifica. Por defecto `frt.utn.edu.ar`. Múltiples dominios separados por coma.

---

## 2026-04-23 — Notes seed iniciales

```
1. Ampliación de Cupo
2. Cambio de Comisión
3. Inscripción Fuera de Término
4. Equivalencias
5. Certificado de Alumno Regular
6. Recursar Materia
7. Baja de Materia
```

---

## 2026-04-23 — CSP: `unsafe-inline` / `unsafe-eval` en script-src

**Motivo:** Next.js 16 + React 19 inyectan scripts inline en el HTML inicial. Remover estos flags rompe la app. Se acepta el trade-off mientras Next.js no soporte nonces nativos de forma estable (issue activo en el repo Next.js).

---
