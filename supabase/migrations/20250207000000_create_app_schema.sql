-- Cat-Companion app schema: user_state, room_layout, owned_items, task_completions
-- Run this in Supabase SQL Editor or via: supabase db push

-- User state (one row per user: points, streak, onboarding flag)
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0,
  streak_count integer not null default 0,
  has_completed_onboarding boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Room layout (placed items in cat space)
create table if not exists public.room_layout (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  position_x integer,
  position_y integer,
  wall_anchor_id text,
  rotation integer not null default 0 check (rotation in (0, 90, 180, 270)),
  layer text not null check (layer in ('floor', 'wall')),
  sort_order integer default 0
);

create index if not exists room_layout_user_id_idx on public.room_layout(user_id);

-- Owned items (shop purchases)
create table if not exists public.owned_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  purchased_at timestamptz not null default now()
);

create index if not exists owned_items_user_id_idx on public.owned_items(user_id);

-- Task completions (for history / streaks)
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  date date not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id, date)
);

create index if not exists task_completions_user_date_idx on public.task_completions(user_id, date);

-- Row Level Security
alter table public.user_state enable row level security;
alter table public.room_layout enable row level security;
alter table public.owned_items enable row level security;
alter table public.task_completions enable row level security;

-- user_state: user can only access own row
create policy "user_state_select_own" on public.user_state for select using (auth.uid() = user_id);
create policy "user_state_insert_own" on public.user_state for insert with check (auth.uid() = user_id);
create policy "user_state_update_own" on public.user_state for update using (auth.uid() = user_id);

-- room_layout: user can only access own rows
create policy "room_layout_select_own" on public.room_layout for select using (auth.uid() = user_id);
create policy "room_layout_insert_own" on public.room_layout for insert with check (auth.uid() = user_id);
create policy "room_layout_update_own" on public.room_layout for update using (auth.uid() = user_id);
create policy "room_layout_delete_own" on public.room_layout for delete using (auth.uid() = user_id);

-- owned_items: user can only access own rows
create policy "owned_items_select_own" on public.owned_items for select using (auth.uid() = user_id);
create policy "owned_items_insert_own" on public.owned_items for insert with check (auth.uid() = user_id);
create policy "owned_items_delete_own" on public.owned_items for delete using (auth.uid() = user_id);

-- task_completions: user can only access own rows
create policy "task_completions_select_own" on public.task_completions for select using (auth.uid() = user_id);
create policy "task_completions_insert_own" on public.task_completions for insert with check (auth.uid() = user_id);
create policy "task_completions_delete_own" on public.task_completions for delete using (auth.uid() = user_id);

-- Create user_state row when a new user signs up (Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.user_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
