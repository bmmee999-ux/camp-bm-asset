-- Run this in Supabase SQL Editor
create extension if not exists "pgcrypto";

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_no text not null unique,
  asset_name text not null,
  sap_no text,
  current_status text not null default 'AVAILABLE',
  current_location text not null default 'UNKNOWN',
  repair_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  asset_no text not null references public.assets(asset_no) on update cascade on delete restrict,
  transaction_type text not null check (
    transaction_type in ('BORROW', 'RETURN', 'REPAIR_SEND', 'REPAIR_RECEIVE', 'MOVE')
  ),
  ckl_no text,
  employee_name text,
  employee_id text,
  transaction_date timestamptz not null default now(),
  remark text,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on update cascade on delete cascade,
  file_url text not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  asset_no text not null references public.assets(asset_no) on update cascade on delete restrict,
  old_location text,
  new_location text not null,
  latitude double precision,
  longitude double precision,
  move_date timestamptz not null default now()
);

create index if not exists idx_transactions_asset_no on public.transactions(asset_no);
create index if not exists idx_files_transaction_id on public.files(transaction_id);
create index if not exists idx_locations_asset_no on public.locations(asset_no);
