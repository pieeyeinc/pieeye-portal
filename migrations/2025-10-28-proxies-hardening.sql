-- Proxies hardening: add correlation_id, dedupe, and unique constraint
begin;

-- 1) Add correlation_id column if missing
alter table proxies add column if not exists correlation_id uuid;

-- 2) (Optional) Backfill correlation_id for existing in-progress rows
-- Uncomment if uuid_generate_v4() is available
-- update proxies set correlation_id = uuid_generate_v4()
-- where correlation_id is null and stack_status = 'CREATE_IN_PROGRESS';

-- 3) Dedupe older duplicates, keep the most recently updated row per (user_id, domain_id)
with ranked as (
  select id,
         row_number() over (
           partition by user_id, domain_id
           order by coalesce(updated_at, created_at) desc nulls last
         ) as rn
  from proxies
)
delete from proxies p using ranked r
where p.id = r.id and r.rn > 1;

-- 4) Enforce uniqueness
create unique index if not exists unique_user_domain_proxy on proxies(user_id, domain_id);

-- Helpful indexes
create index if not exists idx_proxies_user_id on proxies(user_id);
create index if not exists idx_proxies_domain_id on proxies(domain_id);

commit;


