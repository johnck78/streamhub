-- StreamHub personal preferences. Run in Supabase SQL Editor.
-- Each signed-in account can access only its own rows.
create table if not exists public.streamhub_title_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  title text not null default '',
  title_type text not null default 'movie' check (title_type in ('movie','tv')),
  watched boolean not null default false,
  not_interested boolean not null default false,
  watchlist boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id),
  constraint no_conflicting_status check (not (watched and not_interested))
);
create table if not exists public.streamhub_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  services text[] not null default array['Netflix','Prime Video','Hulu','Disney Plus','Max','Peacock','Paramount Plus','Apple TV Plus'],
  updated_at timestamptz not null default now()
);
alter table public.streamhub_title_preferences enable row level security;
alter table public.streamhub_user_settings enable row level security;
drop policy if exists "streamhub_own_title_preferences" on public.streamhub_title_preferences;
create policy "streamhub_own_title_preferences"
on public.streamhub_title_preferences for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "streamhub_own_user_settings" on public.streamhub_user_settings;
create policy "streamhub_own_user_settings"
on public.streamhub_user_settings for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.streamhub_title_preferences to authenticated;
grant select, insert, update, delete on public.streamhub_user_settings to authenticated;
-- No grants to anon. Do not use service-role/secret keys in StreamHub's browser code.
