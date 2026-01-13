-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('customer', 'operator', 'admin')) DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drones table
CREATE TABLE drones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('idle', 'flying', 'returning', 'charging', 'offline')) DEFAULT 'idle',
  battery_level INTEGER DEFAULT 100,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deliveries table
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  operator_id UUID REFERENCES users(id),
  drone_id UUID REFERENCES drones(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'pending',
  pin TEXT NOT NULL,  -- 6-digit unlock code for storage compartment
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT,
  package_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telemetry table (stores drone position data)
CREATE TABLE telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id UUID NOT NULL REFERENCES drones(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION,
  heading DOUBLE PRECISION,  -- Compass direction 0-360 degrees (0=North, 90=East, etc.)
  battery_level INTEGER,
  speed DOUBLE PRECISION,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Operators can view all drones
CREATE POLICY "Operators can view drones" ON drones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator')
  );

-- Customers see their own deliveries
CREATE POLICY "Customers see own deliveries" ON deliveries
  FOR SELECT USING (auth.uid() = user_id);

-- Operators see pending and their claimed deliveries
CREATE POLICY "Operators see available and claimed deliveries" ON deliveries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator')
    AND (status = 'pending' OR operator_id = auth.uid())
  );

CREATE POLICY "Customers can create deliveries" ON deliveries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Operators can update claimed deliveries" ON deliveries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator')
    AND (status = 'pending' OR operator_id = auth.uid())
  );

-- Operators can view telemetry
CREATE POLICY "Operators can view telemetry" ON telemetry
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator')
  );

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry;

-- Insert test drone
INSERT INTO drones (name, status, battery_level, current_lat, current_lng)
VALUES ('Drone-Alpha', 'idle', 100, 51.4416, 5.4697);
