-- Admin Dashboard Database Schema
-- Run this in your Supabase SQL editor

-- Proxy table for tracking all customer proxies
CREATE TABLE proxies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  cloudfront_url VARCHAR(500),
  lambda_arn VARCHAR(500),
  stack_name VARCHAR(255) NOT NULL,
  stack_status VARCHAR(50) DEFAULT 'PENDING' CHECK (stack_status IN ('PENDING', 'CREATE_IN_PROGRESS', 'CREATE_COMPLETE', 'CREATE_FAILED', 'UPDATE_IN_PROGRESS', 'UPDATE_COMPLETE', 'UPDATE_FAILED', 'DELETE_IN_PROGRESS', 'DELETE_COMPLETE', 'DELETE_FAILED', 'DISABLED')),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- Proxy provision logs table for detailed logging
CREATE TABLE proxy_provision_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proxy_id UUID NOT NULL REFERENCES proxies(id) ON DELETE CASCADE,
  stack_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  level VARCHAR(20) DEFAULT 'INFO' CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_proxies_user_id ON proxies(user_id);
CREATE INDEX idx_proxies_domain ON proxies(domain);
CREATE INDEX idx_proxies_stack_status ON proxies(stack_status);
CREATE INDEX idx_proxies_created_at ON proxies(created_at);
CREATE INDEX idx_proxy_logs_proxy_id ON proxy_provision_logs(proxy_id);
CREATE INDEX idx_proxy_logs_stack_name ON proxy_provision_logs(stack_name);
CREATE INDEX idx_proxy_logs_timestamp ON proxy_provision_logs(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE proxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_provision_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proxies table
-- Admins can see all proxies, regular users can only see their own
CREATE POLICY "Admins can view all proxies" ON proxies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = proxies.user_id 
      AND users.clerk_id = auth.jwt() ->> 'sub'
      AND (
        -- This would be replaced with actual admin role check in production
        users.email LIKE '%@pieeye.com' OR 
        users.email LIKE '%@consentgate.io'
      )
    )
  );

CREATE POLICY "Users can view own proxies" ON proxies
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for proxy_provision_logs table
CREATE POLICY "Admins can view all proxy logs" ON proxy_provision_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM proxies 
      JOIN users ON proxies.user_id = users.id
      WHERE proxies.id = proxy_provision_logs.proxy_id
      AND users.clerk_id = auth.jwt() ->> 'sub'
      AND (
        -- This would be replaced with actual admin role check in production
        users.email LIKE '%@pieeye.com' OR 
        users.email LIKE '%@consentgate.io'
      )
    )
  );

CREATE POLICY "Users can view own proxy logs" ON proxy_provision_logs
  FOR SELECT USING (
    proxy_id IN (
      SELECT id FROM proxies 
      WHERE user_id IN (
        SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- Function to automatically create proxy record when domain is verified
CREATE OR REPLACE FUNCTION create_proxy_on_domain_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create proxy if domain status changed to 'verified'
  IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
    INSERT INTO proxies (user_id, domain_id, domain, stack_name)
    VALUES (NEW.user_id, NEW.id, NEW.domain, 'consentgate-' || NEW.user_id || '-' || replace(NEW.domain, '.', '-'));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create proxy when domain is verified
CREATE TRIGGER trigger_create_proxy_on_verification
  AFTER UPDATE ON domains
  FOR EACH ROW
  EXECUTE FUNCTION create_proxy_on_domain_verification();
