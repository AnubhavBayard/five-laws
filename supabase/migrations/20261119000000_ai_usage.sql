-- Per-user daily AI request counter. Only the ai-step Edge Function touches it, through increment_ai_usage().
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
-- No policies: clients cannot read or write the table directly.

-- Atomically counts one request for the calling user and reports whether they are still under the cap.
create or replace function public.increment_ai_usage(cap integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_count integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.ai_usage (user_id, day, count)
  values (uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into new_count;
  return new_count <= cap;
end;
$$;

revoke all on function public.increment_ai_usage(integer) from public, anon;
grant execute on function public.increment_ai_usage(integer) to authenticated;
