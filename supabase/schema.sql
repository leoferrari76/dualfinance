-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  couple_id uuid,
  share_with_partner boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────
-- COUPLES
-- ─────────────────────────────────────────
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  user_1_id uuid not null references public.profiles(id) on delete cascade,
  user_2_id uuid references public.profiles(id) on delete set null,
  invite_code text not null unique default upper(substring(gen_random_uuid()::text from 1 for 8)),
  created_at timestamptz not null default now()
);

alter table public.couples enable row level security;

create policy "Couple members can view their couple"
  on public.couples for select
  using (auth.uid() = user_1_id or auth.uid() = user_2_id);

create policy "User can create couple"
  on public.couples for insert
  with check (auth.uid() = user_1_id);

create policy "Couple members can update couple"
  on public.couples for update
  using (auth.uid() = user_1_id or auth.uid() = user_2_id);

-- Add FK from profiles to couples after both tables exist
alter table public.profiles
  add constraint profiles_couple_id_fkey
  foreign key (couple_id) references public.couples(id) on delete set null;

-- ─────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────
create type public.segment as enum (
  'Moradia',
  'Educação',
  'Saúde',
  'Transporte',
  'Financiamento',
  'Alimentação',
  'Pessoal',
  'Trabalho'
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  segment public.segment not null,
  custom_name text,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "Users can view own and system categories"
  on public.categories for select
  using (user_id is null or auth.uid() = user_id);

create policy "Users can create own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- CREDIT CARDS
-- ─────────────────────────────────────────
create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  closing_day smallint not null check (closing_day between 1 and 31),
  created_at timestamptz not null default now()
);

alter table public.credit_cards enable row level security;

create policy "Users can manage own credit cards"
  on public.credit_cards for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- TRANSACTIONS
-- ─────────────────────────────────────────
create type public.transaction_type as enum ('income', 'expense');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.transaction_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid not null references public.categories(id),
  date date not null,
  description text not null default '',
  is_fixed boolean not null default false,
  credit_card_id uuid references public.credit_cards(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- Owner always sees their own transactions
create policy "Users can manage own transactions"
  on public.transactions for all
  using (auth.uid() = user_id);

-- Partner can see transactions when share_with_partner is true
create policy "Partner can view shared transactions"
  on public.transactions for select
  using (
    exists (
      select 1 from public.couples c
      join public.profiles p on p.id = transactions.user_id
      where (c.user_1_id = auth.uid() or c.user_2_id = auth.uid())
        and (c.user_1_id = transactions.user_id or c.user_2_id = transactions.user_id)
        and p.share_with_partner = true
    )
  );

-- ─────────────────────────────────────────
-- INSTALLMENTS
-- ─────────────────────────────────────────
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  description text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  per_installment_amount numeric(12, 2) not null check (per_installment_amount > 0),
  total_installments smallint not null check (total_installments > 0),
  start_date date not null,
  end_date date not null,
  category_id uuid not null references public.categories(id),
  created_at timestamptz not null default now()
);

alter table public.installments enable row level security;

create policy "Users can manage own installments"
  on public.installments for all
  using (
    exists (
      select 1 from public.credit_cards cc
      where cc.id = installments.credit_card_id
        and cc.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- SEED: default system categories (user_id = null)
-- ─────────────────────────────────────────
insert into public.categories (segment, custom_name, user_id) values
  ('Moradia', null, null),
  ('Educação', null, null),
  ('Saúde', null, null),
  ('Transporte', null, null),
  ('Financiamento', null, null),
  ('Alimentação', null, null),
  ('Pessoal', null, null),
  ('Trabalho', null, null);

-- ─────────────────────────────────────────
-- FUNCTION: auto-create profile on sign up
-- ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
