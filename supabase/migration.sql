-- Add subscription fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;
