-- Notifications table (in-app notification center)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on notifications(user_id);

-- Enable RLS
alter table notifications enable row level security;

-- Users can read and update their own notifications
drop policy if exists "Users manage own notifications" on notifications;
create policy "Users manage own notifications"
  on notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow service role to insert notifications (for admin broadcast)
drop policy if exists "Service role inserts notifications" on notifications;
create policy "Service role inserts notifications"
  on notifications for insert
  with check (true);
