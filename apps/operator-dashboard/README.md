# Operator Dashboard

Control panel for remote drone operators to monitor flights and intervene when needed.

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS
- WebSocket (real-time updates)
- MQTT (drone communication)

## Getting Started

```bash
cd apps/operator-dashboard
pnpm install
pnpm dev
```

Runs on **http://localhost:3001**

## Features to Build
- [ ] Operator authentication
- [ ] Available deliveries list
- [ ] Claim delivery button
- [ ] Live video feed display
- [ ] Drone telemetry (battery, GPS, altitude)
- [ ] Manual flight controls (joystick/arrows)
- [ ] Emergency stop button

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/deliveries/available` | GET | List pending deliveries |
| `/api/deliveries/[id]/claim` | POST | Claim a delivery |
| `/api/drones/[id]/command` | POST | Send drone command |
| `/api/drones/[id]/telemetry` | GET | Get latest telemetry |

## Folder Structure

```
app/
├── api/           # Backend routes
├── page.tsx       # Dashboard home
└── layout.tsx     # Root layout
lib/
├── mqtt-client.ts      # MQTT connection
└── websocket-bridge.ts # WS bridge
components/             # React components
```
