-- Add attestation fields to domains for DNS bypass with audit trail
alter table domains add column if not exists attested_owner boolean not null default false;
alter table domains add column if not exists attested_at timestamp with time zone;
alter table domains add column if not exists attested_ip text;

-- Add attestation fields to domains for DNS bypass with owner attestation
alter table domains add column if not exists attested_owner boolean not null default false;
alter table domains add column if not exists attested_at timestamptz null;
alter table domains add column if not exists attested_ip text null;


