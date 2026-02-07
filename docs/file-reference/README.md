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
| **app/layout.tsx** | Root HTML layout: wraps all pages with `PlayerProvider`, sets metadata. |
| **app/page.tsx** | Home page at `/`: 3-column layout (Sidebar, tasks area, cat space placeholder). |
| **app/auth/login/page.tsx** | Login form (email/password); Supabase `signInWithPassword`; redirect to `/` on success. |
| **app/auth/signup/page.tsx** | Sign-up form; Supabase `signUp`; redirect to `/auth/login` on success. |

---

## Types

| File | Purpose |
|------|--------|
| **types/user.ts** | `UserState`, `RoomLayoutItem` (itemId, position, rotation, layer). |
| **types/task.ts** | `Task`, `TaskType` (id, type, title, pointValue, completedAt). |
| **types/shop.ts** | `ShopItem`, `PlacementRule` (itemId, name, category, price, placementRules, rarity). |

---

## Context

| File | Purpose |
|------|--------|
| **context/PlayerContext.tsx** | `PlayerProvider` and `usePlayer()`: state (points, ownedItems, roomLayout, hasCompletedOnboarding), setters, `loadUserData()` fetches from API on mount. |

---

## Components

| File | Purpose |
|------|--------|
| **components/layout/Sidebar.tsx** | Left sidebar: Nav + Calendar. |
| **components/layout/Nav.tsx** | Links (Today, Shop, Cat space) and Log out (Supabase signOut + redirect). |
| **components/layout/Calendar.tsx** | Placeholder day display. |
| **components/MainContent.tsx** | Center column: shows points from `usePlayer()`, tasks placeholder. |

---

## API routes

| File | Purpose |
|------|--------|
| **app/api/user/state/route.ts** | GET: return points, streakCount, hasCompletedOnboarding for current user. PATCH: update user_state. |
| **app/api/user/room/route.ts** | GET: return room_layout as `RoomLayoutItem[]`. PUT: replace all room_layout rows for user. |
| **app/api/user/owned-items/route.ts** | GET: return item_id list. POST: body `{ itemId }`, insert row, return new list. |

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

## Supabase (database)

| File | Purpose |
|------|--------|
| **supabase/migrations/20250207000000_create_app_schema.sql** | Creates tables `user_state`, `room_layout`, `owned_items`, `task_completions`, RLS policies, and a trigger to create `user_state` on signup. Run in Supabase SQL Editor or via `supabase db push`. |
| **supabase/README.md** | How to run the migration (Dashboard vs CLI). |

---

## Docs

| File | Purpose |
|------|--------|
| **docs/full-app-plan.md** | Product and technical plan: stack, 3-column layout, tasks, shop, cat space, auth, DB, onboarding, MVP checklist. |
| **docs/isometric-cat-space.md** | Implementation plan for the isometric 2.5D cat room: CSS approach, view/edit mode, placement, cat reactions. |
| **docs/file-reference/README.md** | This file — explains what each project file does. |
