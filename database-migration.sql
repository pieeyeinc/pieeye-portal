-- Database Migration: Add enterprise plan support
-- Run this in your Supabase SQL editor

-- Update the subscriptions table to allow 'enterprise' plan
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_plan_check 
CHECK (plan IN ('starter', 'pro', 'enterprise'));

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name = 'plan';
