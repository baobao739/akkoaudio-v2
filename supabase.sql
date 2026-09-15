-- Run once in Supabase SQL Editor.
-- If you already created accounts earlier, also run the migration block at the bottom.

create extension if not exists pgcrypto;

-- Legacy tables (kept so old deploys do not break; new gate uses accounts)
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 64),
  contact text check (contact is null or char_length(contact) <= 120),
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 300)
);

create index if not exists access_requests_status_idx
  on public.access_requests (status, created_at desc);

create table if not exists public.access_tokens (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.access_requests(id) on delete set null,
  label text check (label is null or char_length(label) <= 64),
  token_hash text not null unique,
  token_prefix text not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists access_tokens_active_idx
  on public.access_tokens (revoked, created_at desc);

-- Account system (username + password, admin approval / revoke)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique
    check (char_length(trim(username)) between 3 and 32),
  password_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'revoked')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 300),
  last_login_at timestamptz
);

create index if not exists accounts_status_idx
  on public.accounts (status, created_at desc);

create index if not exists accounts_username_lower_idx
  on public.accounts (lower(username));

alter table public.access_requests enable row level security;
alter table public.access_tokens enable row level security;
alter table public.accounts enable row level security;

-- Migration: if accounts already existed without "revoked", run this:
-- alter table public.accounts drop constraint if exists accounts_status_check;
-- alter table public.accounts add constraint accounts_status_check
--   check (status in ('pending', 'approved', 'denied', 'revoked'));
