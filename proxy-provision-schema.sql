-- Proxy Provision Logs Schema
-- Run this in your Supabase SQL editor

-- Proxy provision logs table
CREATE TABLE proxy_provision_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  stack_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'creating', 'completed', 'failed')),
  cloudfront_url VARCHAR(500),
  lambda_arn VARCHAR(500),
  error_message TEXT,
  progress_logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, domain_id)
);

-- Create indexes for better performance
CREATE INDEX idx_proxy_logs_user_id ON proxy_provision_logs(user_id);
CREATE INDEX idx_proxy_logs_domain_id ON proxy_provision_logs(domain_id);
CREATE INDEX idx_proxy_logs_status ON proxy_provision_logs(status);

-- Enable Row Level Security (RLS)
ALTER TABLE proxy_provision_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proxy_provision_logs table
CREATE POLICY "Users can view own proxy logs" ON proxy_provision_logs
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can insert own proxy logs" ON proxy_provision_logs
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can update own proxy logs" ON proxy_provision_logs
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));
