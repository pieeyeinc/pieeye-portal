-- Add GTM container id to domains so we can reuse it in provisioning
alter table domains add column if not exists gtm_container_id text;


