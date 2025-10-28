-- Add soft-disable capability to proxies
begin;

alter table proxies add column if not exists disabled boolean not null default false;
create index if not exists idx_proxies_disabled on proxies(disabled);

commit;


