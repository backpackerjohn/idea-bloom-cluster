create extension if not exists pgcrypto;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_at timestamptz null,
  status text not null default 'pending' check (status in ('pending','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

alter table public.reminders enable row level security;

create policy "reminders_select_own" on public.reminders
  for select to authenticated
  using (auth.uid() = user_id);

create policy "reminders_insert_own" on public.reminders
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "reminders_update_own" on public.reminders
  for update to authenticated
  using (auth.uid() = user_id);

create policy "reminders_delete_own" on public.reminders
  for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists idx_reminders_user_id on public.reminders(user_id);
create index if not exists idx_reminders_due_at on public.reminders(due_at);
