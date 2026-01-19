-- ========================================
-- UDD Platform - Database Reset Script
-- ========================================
-- WARNING: This will DELETE all existing data!
-- ========================================

-- Step 1: Drop all existing tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS telemetry CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS drones CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Step 2: Remove from realtime publication (ignore errors if not exists)
-- ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS deliveries;
-- ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS telemetry;

-- ========================================
-- RECREATE ALL TABLES
-- ========================================

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drones table
CREATE TABLE drones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  battery_level INTEGER DEFAULT 100,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliveries table (updated with stripe_session_id)
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES auth.users(id),
  drone_id UUID REFERENCES drones(id),
  status TEXT DEFAULT 'pending',
  pin TEXT NOT NULL,  -- 6-digit unlock code for storage compartment
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT,
  package_description TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  stripe_session_id TEXT UNIQUE,  -- For idempotency check
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telemetry table (stores drone position data)
CREATE TABLE telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id UUID NOT NULL REFERENCES drones(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION,
  heading DOUBLE PRECISION,  -- Compass direction 0-360 degrees
  battery_level INTEGER,
  speed DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES
-- ========================================

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Drones are visible to all for demo
CREATE POLICY "Anyone can view drones" ON drones
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update drones" ON drones
  FOR UPDATE USING (true);

-- Deliveries are visible to all for demo
CREATE POLICY "Anyone can view deliveries" ON deliveries
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update deliveries" ON deliveries
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert deliveries" ON deliveries
  FOR INSERT WITH CHECK (true);

-- Telemetry is visible to all for demo
CREATE POLICY "Anyone can view telemetry" ON telemetry
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert telemetry" ON telemetry
  FOR INSERT WITH CHECK (true);

-- ========================================
-- ENABLE REALTIME
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE drones;

-- Trigger to ensure status is 'charging' if 'idle' but battery < 100%
CREATE OR REPLACE FUNCTION handle_drone_charging_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'idle' AND NEW.battery_level < 100 THEN
    NEW.status := 'charging';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_charging_status
  BEFORE INSERT OR UPDATE ON drones
  FOR EACH ROW
  EXECUTE FUNCTION handle_drone_charging_status();

-- Insert test drones
INSERT INTO drones (name, status, battery_level, current_lat, current_lng)
VALUES 
  ('Drone-001', 'idle', 100, 51.4416, 5.4697),
  ('Drone-002', 'charging', 85, 51.4403, 5.4693),
  ('Drone-003', 'charging', 92, 51.4438, 5.4717),
  ('Drone-004', 'charging', 45, 51.4416, 5.4696),
  ('Drone-005', 'idle', 100, 51.4418, 5.4717),
  ('Drone-006', 'charging', 78, 51.4425, 5.4705),
  ('Drone-007', 'charging', 95, 51.4410, 5.4680),
  ('Drone-008', 'charging', 62, 51.4430, 5.4725),
  ('Drone-009', 'charging', 88, 51.4405, 5.4710),
  ('Drone-010', 'idle', 100, 51.4420, 5.4690),
  ('Drone-011', 'charging', 55, 51.4415, 5.4730),
  ('Drone-012', 'charging', 82, 51.4440, 5.4685);

