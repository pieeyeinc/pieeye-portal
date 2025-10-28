-- Provision Logs Schema (id, user_id, domain_id, correlation_id, message, level, created_at)
-- Run this SQL in Supabase once. Safe to re-run (creates only if missing).

create extension if not exists "uuid-ossp";

create table if not exists public.provision_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  domain_id uuid not null references public.domains(id) on delete cascade,
  correlation_id uuid not null,
  message text not null,
  level text not null check (level in ('info','warn','error')),
  created_at timestamptz not null default now()
);

create index if not exists idx_provision_logs_domain_created on public.provision_logs(domain_id, created_at desc);
create index if not exists idx_provision_logs_corr on public.provision_logs(correlation_id);

alter table public.provision_logs enable row level security;

-- Basic RLS policies (user can see own domain logs)
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'provision_logs' and policyname = 'Users can select own logs'
  ) then
    create policy "Users can select own logs" on public.provision_logs
      for select using (
        user_id in (select id from public.users where clerk_id = auth.jwt() ->> 'sub')
      );
  end if;
end $$;


