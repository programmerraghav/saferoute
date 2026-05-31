# SOS Crash Detection System

A production-ready frontend crash detection module that continuously monitors GPS location and movement. When a crash is suspected, it automatically triggers an SOS event with a full confirmation flow before sending alerts to the backend.

## Architecture

```
src/
├── types/
│   └── index.ts                  # TypeScript interfaces & enums
├── config/
│   └── index.ts                  # Configurable thresholds & API config
├── utils/
│   ├── geo.ts                    # Haversine, bearing, unit conversion
│   └── sound.ts                  # Web Audio alarm & vibration API
├── services/
│   ├── LocationHistoryManager.ts # Rolling GPS buffer & speed analysis
│   ├── CrashDetectionService.ts  # Core state machine & detection logic
│   ├── SOSManager.ts             # Countdown, confirmation, alert trigger
│   └── ApiService.ts             # Backend integration layer (mock)
├── hooks/
│   ├── useGeolocation.ts         # React hook for Geolocation API
│   └── useCrashDetection.ts      # Master hook wiring everything together
├── components/
│   ├── EmergencyModal.tsx/.css    # Full-screen emergency overlay
│   └── StatusDashboard.tsx        # Main monitoring dashboard
├── App.tsx / App.css              # Root component & layout styles
├── index.css                      # Global theme & reset
└── main.tsx                       # Entry point
```

## Detection Pipeline

```
MONITORING → SUDDEN_STOP_DETECTED → STATIONARY_CHECK → CONFIRMATION_COUNTDOWN → SOS_TRIGGERED
     ↑              ↓ (resume)            ↓ (resume)          ↓ (cancel)
     └──────────────┴────────────────────┴──────────────────── MONITORING
```

### Three-Stage Crash Detection

1. **Sudden Stop** — Speed drops from >15 km/h to <2 km/h within 3 seconds
2. **Stationary Verification** — User remains within 5m radius for 30 seconds
3. **Confirmation Countdown** — 15-second modal with "I'm Safe" / "Send Help Now"

### False Positive Prevention

- Rolling 60-second movement history
- Speed smoothing via moving average
- GPS jitter detection (unrealistic speed jumps >100 km/h)
- Poor accuracy filtering (>60m readings ignored)
- Gradual deceleration is NOT treated as a crash
- Tab visibility handling (pauses when hidden)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Configuration

All thresholds are configurable via `src/config/index.ts`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MOVING_SPEED_THRESHOLD` | 15 km/h | Minimum speed to consider "moving" |
| `SUDDEN_STOP_TIME_WINDOW` | 3 sec | Window for sudden stop detection |
| `NEAR_ZERO_SPEED` | 2 km/h | Speed considered "stopped" |
| `STATIONARY_RADIUS` | 5 m | Max radius for stationary check |
| `STATIONARY_TIME` | 30 sec | Required immobility duration |
| `COUNTDOWN_DURATION` | 15 sec | Countdown before auto-SOS |
| `MIN_DECELERATION_RATE` | 5 km/h/s | Minimum rate for "sudden" stop |

## Backend Integration

The API layer uses environment variables (`.env`):

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_SOS_ENDPOINT=/sos
VITE_API_TIMEOUT=10000
VITE_USER_ID=anonymous-user
```

### SOS Payload (POST /api/sos)

```json
{
  "userId": "...",
  "timestamp": "2026-05-30T08:00:00.000Z",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "lastKnownSpeed": 45.2,
  "crashDetected": true,
  "movementHistory": [...],
  "deviceInfo": { "userAgent": "...", "platform": "..." }
}
```

> **TODO:** Replace mock responses in `ApiService.ts` with actual `fetch` calls when your backend is ready.

## Usage in Your App

```tsx
import { useCrashDetection } from './hooks/useCrashDetection';

function MyComponent() {
  const {
    state, speed, position, countdown,
    start, stop, cancelSOS, sendSOSNow
  } = useCrashDetection();

  // state: 'monitoring' | 'sudden_stop_detected' | ...
  // All detection logic runs automatically once start() is called
}
```

## Tech Stack

- **React 18** + **TypeScript**
- **Vite 6** (build tooling)
- **Web Audio API** (alarm sound)
- **Vibration API** (haptic feedback)
- **Geolocation API** (GPS tracking)
