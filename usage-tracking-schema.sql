-- Usage Tracking Schema for PieEye Portal
-- Run this in your Supabase SQL editor

-- Usage tracking table
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
    'page_load', 'consent_banner', 'consent_decision', 'privacy_policy', 
    'cookie_scan', 'gdpr_check', 'data_processing'
  )),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_timestamp ON usage_tracking(timestamp);
CREATE INDEX idx_usage_tracking_month_year ON usage_tracking(month, year);
CREATE INDEX idx_usage_tracking_user_month_year ON usage_tracking(user_id, month, year);

-- Enable Row Level Security (RLS)
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for usage_tracking table
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can insert own usage" ON usage_tracking
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- Function to get monthly usage for a user
CREATE OR REPLACE FUNCTION get_user_monthly_usage(
  p_user_id UUID,
  p_month INTEGER,
  p_year INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM usage_tracking
    WHERE user_id = p_user_id
      AND month = p_month
      AND year = p_year
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old usage data (optional)
CREATE OR REPLACE FUNCTION cleanup_old_usage_data()
RETURNS void AS $$
BEGIN
  DELETE FROM usage_tracking
  WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
