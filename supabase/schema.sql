-- Hustl. database schema. Run this once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to re-run: it drops and recreates the policies and triggers.

-- ---------- tables ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  name_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id bigint generated always as identity primary key,
  poster_id uuid not null references profiles(id) on delete cascade,
  worker_id uuid references profiles(id) on delete set null,
  poster_name text,
  title text not null check (char_length(title) between 4 and 70),
  description text check (char_length(description) <= 600),
  category text not null check (category in ('errands','movein','tutoring','pickup','odd')),
  location text,
  deadline text,
  pay numeric(6,2) not null check (pay between 5 and 100),
  status text not null default 'open' check (status in ('open','requested','accepted','in_progress','completed')),
  paid boolean not null default false,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  paid_at timestamptz
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','sys','code')),
  body text not null check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id bigint generated always as identity primary key,
  task_id bigint not null references tasks(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  unique (task_id, reviewer_id)
);

create index if not exists tasks_status_created on tasks (status, created_at desc);
create index if not exists messages_task_created on messages (task_id, created_at);

-- ---------- only @iu.edu can sign up, and every user gets a profile ----------
create or replace function enforce_iu_email() returns trigger as $$
begin
  if new.email is null or new.email !~* '@(.+\.)?iu\.edu$' then
    raise exception 'Only @iu.edu emails can join Hustl.';
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists on_signup on auth.users;
drop trigger if exists check_iu_email on auth.users;
create trigger check_iu_email before insert on auth.users
  for each row execute function enforce_iu_email();

create or replace function make_profile() returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, initcap(regexp_replace(split_part(new.email, '@', 1), '[0-9]+|[._-]+', ' ', 'g')));
  return new;
end $$ language plpgsql security definer set search_path = public;

drop trigger if exists on_signup_profile on auth.users;
create trigger on_signup_profile after insert on auth.users
  for each row execute function make_profile();

-- ---------- task rules: who may move a task to which status ----------
create or replace function guard_task_update() returns trigger as $$
declare
  me uuid := auth.uid();
  ok boolean := false;
begin
  if me is null then return new; end if;  -- SQL editor / service role

  if new.poster_id is distinct from old.poster_id
     or new.pay is distinct from old.pay
     or new.is_sample is distinct from old.is_sample
     or new.poster_name is distinct from old.poster_name
     or (new.title, new.description, new.category, new.location, new.deadline)
        is distinct from (old.title, old.description, old.category, old.location, old.deadline) then
    raise exception 'Task details cannot be changed';
  end if;

  -- a student requests an open task
  if old.status = 'open' and old.worker_id is null and new.status = 'requested'
     and new.worker_id = me and (me <> old.poster_id or old.is_sample) and new.paid = false then
    ok := true;
  end if;

  -- the poster accepts, declines, or releases payment
  if me = old.poster_id then
    if old.status = 'requested' and new.status = 'accepted' and new.worker_id = old.worker_id and new.paid = false then ok := true; end if;
    if old.status = 'requested' and new.status = 'open' and new.worker_id is null and new.paid = false then ok := true; end if;
    if old.status = 'completed' and new.status = 'completed' and old.paid = false and new.paid = true
       and new.worker_id = old.worker_id then ok := true; end if;
  end if;

  -- the worker starts and finishes
  if me = old.worker_id and new.worker_id = old.worker_id and new.paid = old.paid then
    if old.status = 'accepted' and new.status = 'in_progress' then ok := true; end if;
    if old.status = 'in_progress' and new.status = 'completed' then ok := true; end if;
  end if;

  if not ok then raise exception 'That change is not allowed'; end if;
  if new.paid and not old.paid then new.paid_at := now(); end if;
  if new.status = 'completed' and old.status <> 'completed' then new.completed_at := now(); end if;
  return new;
end $$ language plpgsql;

drop trigger if exists guard_task on tasks;
create trigger guard_task before update on tasks
  for each row execute function guard_task_update();

-- ---------- row level security ----------
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;

drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles for select to authenticated using (true);
drop policy if exists "edit own profile" on profiles;
create policy "edit own profile" on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "read tasks" on tasks;
create policy "read tasks" on tasks for select to authenticated using (true);
drop policy if exists "post as yourself" on tasks;
create policy "post as yourself" on tasks for insert to authenticated
  with check (auth.uid() = poster_id and status = 'open' and worker_id is null and paid = false and is_sample = false);
drop policy if exists "update your own tasks" on tasks;
create policy "update your own tasks" on tasks for update to authenticated
  using (auth.uid() = poster_id or auth.uid() = worker_id or (status = 'open' and worker_id is null));

drop policy if exists "read own task chat" on messages;
create policy "read own task chat" on messages for select to authenticated using (
  exists (select 1 from tasks t where t.id = task_id and auth.uid() in (t.poster_id, t.worker_id)));
drop policy if exists "send in own task chat" on messages;
create policy "send in own task chat" on messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (select 1 from tasks t where t.id = task_id and auth.uid() in (t.poster_id, t.worker_id)));

drop policy if exists "read reviews" on reviews;
create policy "read reviews" on reviews for select to authenticated using (true);
drop policy if exists "review after payment" on reviews;
create policy "review after payment" on reviews for insert to authenticated with check (
  reviewer_id = auth.uid()
  and exists (select 1 from tasks t where t.id = task_id and t.paid
      and ((t.poster_id = auth.uid() and t.worker_id = reviewee_id) or (t.worker_id = auth.uid() and t.poster_id = reviewee_id))));
drop policy if exists "edit own review" on reviews;
create policy "edit own review" on reviews for update to authenticated using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

-- ---------- grants (needed because tables are not auto exposed) ----------
grant usage on schema public to authenticated;
grant select, update on profiles to authenticated;
grant select, insert, update on tasks to authenticated;
grant select, insert on messages to authenticated;
grant select, insert, update on reviews to authenticated;

-- ---------- live updates ----------
do $$ begin
  begin alter publication supabase_realtime add table public.tasks; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
end $$;
