-- Reading Room schema. Run this in the Supabase SQL editor.

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  content text not null check (char_length(content) between 1 and 200000),
  -- Page the article was imported from, when it came from a link.
  source_url text check (source_url ~ '^https?://'),
  created_at timestamptz not null default now()
);

-- A saved meaning for a range of characters inside an article's content.
-- Offsets are character indexes into articles.content: [start_offset, end_offset).
create table if not exists public.annotations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  start_offset integer not null check (start_offset >= 0),
  end_offset integer not null check (end_offset > start_offset),
  selected_text text not null,
  meaning text not null check (char_length(meaning) between 1 and 5000),
  -- IPA, e.g. /ˈfræɡmən.tɪd/. Optional; usually filled by the lookup-word function.
  pronunciation text check (char_length(pronunciation) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists annotations_article_id_idx on public.annotations (article_id);

alter table public.articles enable row level security;
alter table public.annotations enable row level security;

-- Phase 1 has no login: the anon key can read and write everything.
-- Replace these policies with per-user ones once auth is added.
create policy "anon full access to articles" on public.articles
  for all to anon using (true) with check (true);

create policy "anon full access to annotations" on public.annotations
  for all to anon using (true) with check (true);
