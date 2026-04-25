# Turnos UTN FRT — Missing Features Implementation Plan

**Goal:** Implement all features missing from the documented use cases (Documentacion Gestion Turnos UTN).

**Architecture:** Next.js 16 App Router + Supabase + Resend for emails. Reuse existing patterns (server actions, API routes with adminClient, Zod validation, audit log).

**Tech Stack:** Next.js 16, Supabase, @base-ui/react, Resend (new), React 19, TypeScript, Tailwind v4.

---

## Scope (what's missing, prioritized)

### A. Email system (blocking multiple features)

- Install + configure Resend
- Email utility (`src/lib/email/send.ts`) with templates
- Enforce email verification on login (block unverified users)
- Send email on 3-attempt cancel lockout
- Send email when interval is deactivated (to affected students)
- Welcome/verification email flow on register

### B. Business-logic fixes

- POST /api/turns: assign turn to interval with **MOST remaining capacity** (not first-match)
- POST /api/turns: validate no pending turn with same note (confirm working)
- Turn cancellation: confirm slot release works (already via status change — docs intent)

### C. Admin features

- Audit log viewer page (`/admin/audit-log`)
- Worker full delete (hard delete, besides deactivate/ban)

### D. Branding

- Replace text "UTN ✶ FRT" with proper SVG logo between "UTN" and "FRT"
- Place SVG in `public/utn-logo.svg`
- Update header.tsx and sidebar.tsx

---

## File Structure

**Create:**

- `src/lib/email/send.ts` — Resend client wrapper
- `src/lib/email/templates.ts` — HTML email templates
- `src/app/(admin)/audit-log/page.tsx` + client
- `src/app/api/audit-log/route.ts` — GET paginated logs
- `public/utn-logo.svg` — UTN logo
- `src/components/brand/utn-brand.tsx` — reusable logo+text

**Modify:**

- `src/app/(auth)/login/actions.ts` — block unverified users
- `src/app/api/turns/route.ts` — fix interval assignment (MOST capacity)
- `src/app/api/turns/[id]/route.ts` — send email on cancel lockout
- `src/app/api/intervals/[id]/route.ts` — send email to affected students on deactivation + use explain_desactivate
- `src/app/api/workers/[id]/route.ts` — add DELETE method (hard delete)
- `src/components/layout/header.tsx` — use UtnBrand
- `src/components/layout/sidebar.tsx` — use UtnBrand
- `package.json` — add `resend`
- `.env.local` template — add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

---

## Tasks

### Task 1: Install Resend + email utility

- Install `resend` package
- Create `src/lib/email/send.ts` with `sendEmail({to, subject, html})` using Resend
- Create `src/lib/email/templates.ts` with: `cancelLockoutEmail`, `intervalDeactivatedEmail`, `welcomeEmail`
- Graceful degradation: if `RESEND_API_KEY` is missing, log to console instead of failing

### Task 2: Enforce email verification at login

- In `loginAction`, check `user.email_confirmed_at`. If null, sign out and return error message.

### Task 3: Cancel lockout email

- In PATCH /api/turns/[id] cancel flow, when `newAttempts >= MAX_CANCEL_ATTEMPTS`, send email to student

### Task 4: Interval deactivation email

- In PATCH /api/intervals/[id] when `is_active` changes from true→false, fetch all affected students (via turns) and send email with `explain_desactivate` message

### Task 5: Interval assignment by most capacity

- In POST /api/turns, refactor interval selection: order available intervals by remaining capacity DESC before picking

### Task 6: Audit log viewer

- Server page fetches latest 100 rows joined with actor profile
- Client component with filter by action type, actor, date range
- Limit access to admin role

### Task 7: Hard delete worker

- Add DELETE method in `/api/workers/[id]` that calls `adminClient.auth.admin.deleteUser(id)` (cascades profile via ON DELETE CASCADE)
- Admin UI: add "Eliminar definitivamente" option with double confirmation

### Task 8: UTN brand component

- Create `public/utn-logo.svg` (classic UTN crest)
- `src/components/brand/utn-brand.tsx` with sizes `sm|md|lg`: renders "UTN [logo] FRT"
- Replace text occurrences in header.tsx and sidebar.tsx

---

## Testing strategy

Manual verification per task (no test framework set up yet):

1. After each task: restart dev server, verify affected flow in browser
2. Email tests: use Resend test mode or log-to-console fallback
3. Sanity: ensure `npm run build` succeeds at the end

## Out of scope

- Rate limiting (separate task)
- PWA icon PNGs (separate task)
- Full test suite (separate task)
- Vercel deploy (separate task)
