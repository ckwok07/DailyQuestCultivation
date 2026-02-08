-- Day snapshots: one row per user per calendar day (points and streak at end of that day)
create table if not exists public.day_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  points_snapshot integer not null default 0,
  streak_snapshot integer not null default 0,
  primary key (user_id, date)
);

create index if not exists day_snapshots_user_id_idx on public.day_snapshots(user_id);

alter table public.day_snapshots enable row level security;

create policy "day_snapshots_select_own" on public.day_snapshots for select using (auth.uid() = user_id);
create policy "day_snapshots_insert_own" on public.day_snapshots for insert with check (auth.uid() = user_id);
create policy "day_snapshots_update_own" on public.day_snapshots for update using (auth.uid() = user_id);
create policy "day_snapshots_delete_own" on public.day_snapshots for delete using (auth.uid() = user_id);
