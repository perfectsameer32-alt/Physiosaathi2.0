-- ==============================================================================
-- Pysiosaathi Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  age integer default 25,
  height numeric default 172,
  weight numeric default 68,
  target_weight numeric default 65,
  fitness_level text default 'Beginner',
  primary_goal text default 'General Fitness & Mobility',
  weekly_goal_days integer default 3,
  session_length integer default 20,
  language text default 'en',
  onboarded boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- 2. Workout Sessions Table
create table if not exists public.workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  exercise_id text not null,
  name text not null,
  category text not null,
  duration_seconds integer not null,
  duration_formatted text,
  reps integer default 0,
  calories integer default 0,
  accuracy integer default 90,
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Workout Sessions
alter table public.workout_sessions enable row level security;

create policy "Users can view own workout sessions" 
  on public.workout_sessions for select 
  using (auth.uid() = user_id);

create policy "Users can insert own workout sessions" 
  on public.workout_sessions for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete own workout sessions" 
  on public.workout_sessions for delete 
  using (auth.uid() = user_id);

-- 3. User Plans Table
create table if not exists public.user_plans (
  user_id uuid references auth.users on delete cascade primary key,
  active_plan_id text default 'baseline',
  completed_days jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for Plans
alter table public.user_plans enable row level security;

create policy "Users can view own plan" 
  on public.user_plans for select 
  using (auth.uid() = user_id);

create policy "Users can upsert own plan" 
  on public.user_plans for all 
  using (auth.uid() = user_id);

-- 4. Automatically create profile row when user signs up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

