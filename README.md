# 🚁 Universal Delivery Drone Platform

A platform for autonomous delivery drones operated remotely by humans. Move anything—food, groceries, parcels, documents, medicine—while being monitored and assisted by remote operators.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![MQTT](https://img.shields.io/badge/MQTT-HiveMQ-orange)

## Quick Links

| Component | README | Branch |
|-----------|--------|--------|
| User App | [apps/user-app/README.md](./apps/user-app/README.md) | `user-app` |
| Operator Dashboard | [apps/operator-dashboard/README.md](./apps/operator-dashboard/README.md) | `dashboard` |
| Shared Package | [packages/shared/README.md](./packages/shared/README.md) | `backend` |
| Drone Firmware | [firmware/README.md](./firmware/README.md) | `drone` |

**Branches:** `main` → `develop` → `user-app` / `dashboard` / `backend` / `drone`

## Project Vision

Create an inclusive, efficient delivery service that enables remote work opportunities for everyone—including elderly individuals and people with physical limitations—using only an internet connection.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User App      │     │    Operator     │     │     Drone       │
│   (Next.js)     │     │   Dashboard     │     │    (ESP32)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ HTTP/REST             │ WebSocket             │ MQTT
         │                       │                       │
         └───────────┬───────────┴───────────────────────┘
                     │
              ┌──────┴──────┐
              │  Supabase   │
              │  (Database) │
              └─────────────┘
```

## Project Structure

```
udd-platform/
├── apps/
│   ├── user-app/              # Customer-facing app (port 3000)
│   │   └── app/api/           # API routes for deliveries
│   └── operator-dashboard/    # Operator control panel (port 3001)
│       └── app/api/           # API routes for drone control
├── packages/
│   └── shared/                # Shared types & utilities
│       └── src/
│           ├── types.ts       # TypeScript interfaces
│           └── supabase.ts    # Database client
├── supabase/                  # Database schema
└── firmware/                  # ESP32 drone code
    └── esp32-cam/
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Supabase account
- HiveMQ Cloud account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/udd-platform.git
   cd udd-platform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   MQTT_BROKER_URL=your_hivemq_url
   MQTT_USERNAME=your_mqtt_username
   MQTT_PASSWORD=your_mqtt_password
   ```

4. **Run development servers**
   ```bash
   # User App (localhost:3000)
   cd apps/user-app && pnpm dev

   # Operator Dashboard (localhost:3001)
   cd apps/operator-dashboard && pnpm dev
   ```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime, WebSocket |
| IoT Communication | MQTT (HiveMQ Cloud) |
| Hardware | ESP32-CAM, GPS Module |

## Communication Flow

### User Request → Drone
```
User App → REST API → Supabase → MQTT Broker → Drone
```

### Drone Telemetry → Dashboard
```
Drone → MQTT Broker → WebSocket Server → Operator Dashboard
```

## Team Roles

| Role | Responsibilities |
|------|-----------------|
| Hardware Engineer | Drone assembly, flight controls, sensors |
| Backend Developer | API routes, Supabase, MQTT, WebSocket |
| Frontend (User App) | Login, delivery request UI, tracking |
| Frontend (Dashboard) | Operator controls, live video, drone status |

## Features

### Must Have
- [x] Project structure & dependencies
- [ ] User authentication
- [ ] Delivery request system
- [ ] Operator dashboard with flight controls
- [ ] Live drone telemetry
- [ ] MQTT communication

### Should Have
- [ ] Storage compartment lock/unlock
- [ ] Push notifications
- [ ] Battery level display

### Could Have
- [ ] Autonomous GPS navigation
- [ ] Return-to-home on signal loss
- [ ] Delivery history

## Security

- Environment variables for sensitive data
- Row Level Security (RLS) on Supabase
- Service role key only used server-side
- MQTT authentication required

## License

This project is part of a student assignment at Fontys University of Applied Sciences.

---


