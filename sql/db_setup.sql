-- DB_SETUP for Amarok Italia
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  is_moderator boolean default false,
  avatar_url text
);

create table if not exists discussions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  author_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid references discussions(id) on delete cascade,
  body text,
  author_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price numeric,
  image_path text,
  author_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  sold boolean default false
);

-- Enable RLS and sample policies (review before production)
alter table profiles enable row level security;
alter table discussions enable row level security;
alter table replies enable row level security;
alter table listings enable row level security;

create policy "profiles_manage_own" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "discussions_select_public" on discussions for select using (true);
create policy "discussions_insert_authed" on discussions for insert using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "discussions_delete_moderator" on discussions for delete using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator = true));
create policy "replies_select_public" on replies for select using (true);
create policy "replies_insert_authed" on replies for insert using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "replies_delete_moderator" on replies for delete using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator = true));
create policy "listings_select_public" on listings for select using (true);
create policy "listings_insert_authed" on listings for insert using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "listings_update_owner_or_moderator" on listings for update using (author_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator = true));
create policy "listings_delete_moderator" on listings for delete using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator = true));
