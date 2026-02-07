# Supabase

## Run the migration

**Option 1 — Supabase Dashboard**

1. Open your project at [supabase.com](https://supabase.com) → SQL Editor.
2. Copy the contents of [migrations/20250207000000_create_app_schema.sql](migrations/20250207000000_create_app_schema.sql) and run it.

**Option 2 — Supabase CLI**

```bash
supabase link   # if not already linked
supabase db push
```

## What it creates

- **user_state** — one row per user (points, streak, onboarding flag); auto-created on signup via trigger.
- **room_layout** — placed items in the cat room (item_id, position, rotation, layer).
- **owned_items** — shop purchases per user.
- **task_completions** — completed tasks per user per date.

All tables use RLS so users only see and change their own data.
