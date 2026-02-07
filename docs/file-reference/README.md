# File reference — what each file does

Short description of each important file in the project.

---

## Root

| File | Purpose |
|------|--------|
| **package.json** | npm package definition: app name, scripts (`dev`, `build`, `start`, `lint`), and dependencies (Next.js, React, Supabase). |
| **tsconfig.json** | TypeScript config: strict mode, path alias `@/*`, Next.js plugin. |
| **next.config.ts** | Next.js config (defaults; add rewrites, env, or headers here). |
| **next-env.d.ts** | TypeScript references for Next.js (do not edit). |
| **middleware.ts** | Runs on every request; calls Supabase `updateSession()` to refresh auth and sync cookies. |
| **.env.local.example** | Template for env vars. Copy to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| **.gitignore** | Tells Git which files/folders to ignore (e.g. `node_modules/`, `.next/`, `.env.local`). |
| **README.md** | Project intro and how to run it. |

---

## App (routes and layout)

| File | Purpose |
|------|--------|
| **app/layout.tsx** | Root HTML layout: wraps all pages (e.g. `<html>`, `<body>`), sets metadata (title, description). |
| **app/page.tsx** | Home page at `/`; default landing content. |

---

## Lib (shared code)

| File | Purpose |
|------|--------|
| **lib/db.ts** | Exports `getDb()`: returns a Supabase server client for database access in server components and API routes. |

### lib/supabase

| File | Purpose |
|------|--------|
| **lib/supabase/client.ts** | Creates the **browser** Supabase client. Use in Client Components and client-side code (e.g. `createClient()`). |
| **lib/supabase/server.ts** | Creates the **server** Supabase client (uses `cookies()`). Use in Server Components and Route Handlers. |
| **lib/supabase/middleware.ts** | Exports `updateSession(request)`: reads cookies from the request, refreshes the Supabase auth session, and writes cookies to the response. Used by root `middleware.ts`. |

---

## Docs

| File | Purpose |
|------|--------|
| **docs/full-app-plan.md** | Product and technical plan: stack, 3-column layout, tasks, shop, cat space, auth, DB, onboarding, MVP checklist. |
| **docs/isometric-cat-space.md** | Implementation plan for the isometric 2.5D cat room: CSS approach, view/edit mode, placement, cat reactions. |
| **docs/file-reference/README.md** | This file — explains what each project file does. |
