-- Ensure one proxy per user/domain pair
create unique index if not exists unique_user_domain_proxy
  on proxies(user_id, domain_id);


