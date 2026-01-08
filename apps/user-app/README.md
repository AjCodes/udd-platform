# User App

Customer-facing web application for requesting and tracking deliveries.

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS
- Supabase Auth

## Getting Started

```bash
cd apps/user-app
pnpm install
pnpm dev
```

Runs on **http://localhost:3000**

## Features to Build
- [ ] User authentication (login/register)
- [ ] Delivery request form
- [ ] Real-time tracking map
- [ ] Delivery history
- [ ] Storage unlock button

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/` | POST | Login/Register |
| `/api/deliveries` | GET | List user's deliveries |
| `/api/deliveries` | POST | Create new delivery |
| `/api/deliveries/[id]` | GET | Get delivery details |
| `/api/deliveries/[id]/unlock` | POST | Unlock storage |

## Folder Structure

```
app/
├── api/           # Backend routes
├── page.tsx       # Home page
├── layout.tsx     # Root layout
└── globals.css    # Global styles
lib/               # Utilities
components/        # React components
```
