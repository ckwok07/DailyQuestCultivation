-- Equipped cosmetics (ids of cosmetics currently worn by the cat)
alter table public.user_state
  add column if not exists equipped_cosmetics text[] not null default '{}';
