# Shared Package (@udd/shared)

Shared TypeScript types and utilities used by both user-app and operator-dashboard.

## Usage

Import in any app:
```typescript
import { Delivery, Drone, createBrowserClient } from '@udd/shared';
```

## Contents

### Types (`src/types.ts`)
- `DeliveryStatus` - pending, assigned, in_transit, delivered, cancelled
- `DroneStatus` - idle, flying, returning, charging, offline
- `Delivery` - Delivery request data
- `Drone` - Drone information
- `Telemetry` - Real-time drone telemetry
- `MQTT_TOPICS` - Topic name helpers

### Supabase Client (`src/supabase.ts`)
- `createBrowserClient()` - For frontend (uses anon key)
- `createServerClient()` - For API routes (uses service role)

## Development

```bash
cd packages/shared
pnpm typecheck
```
