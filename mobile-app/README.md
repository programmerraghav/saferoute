# SafeRoute Mobile App

Expo React Native mobile app — mirrors the web frontend without the voice agent, and adds a fully **offline-capable SOS emergency system**.

## Folder Structure

```
mobile-app/
├── App.js                            # Root
├── app.json                          # Expo config + permissions
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js           # Stack + Bottom Tab nav (SOS FAB button)
│   ├── screens/
│   │   ├── HomeScreen.js             # Stats, quick actions, offline cache
│   │   ├── LoginScreen.js            # JWT auth + guest SOS bypass
│   │   ├── SOSScreen.js              # Full SOS workflow
│   │   ├── ReportPotholeScreen.js    # 3-step report with offline queue
│   │   └── SettingsScreen.js         # Emergency contacts + SOS config
│   ├── services/
│   │   ├── sos.js                    # SOS engine (offline-first)
│   │   ├── auth.js                   # JWT + AsyncStorage
│   │   ├── storage.js                # Offline AsyncStorage wrappers
│   │   └── api.js                    # Fetch with offline fallback
│   └── constants/
│       └── theme.js                  # Dark theme design tokens
```

---

## SOS System — How It Works

### Trigger Methods
| Method | Description |
|--------|-------------|
| **Manual** | Tap the giant SOS button → 10-second countdown → fires |
| **Impact Detection** | Accelerometer > 2.5G spike → prompts user |
| **Stationary Detection** | No movement for 2+ minutes → prompts user |

### SOS Firing Sequence (all offline-capable)
```
1. SMS → family contacts (cellular, no internet needed)
2. Call → 108 Ambulance  (cellular, no internet needed)  
3. Call → 112 Emergency  (native Android emergency dialer)
4. Notification → local device notification
5. Queue → GPS coordinates stored, synced when back online
```

### Offline Architecture
- Emergency contacts stored in **AsyncStorage** (available without internet)
- SMS and calls use **cellular network** (independent of internet)
- Complaints cached in AsyncStorage, synced via **NetInfo** when reconnected
- Last known GPS location stored as fallback

---

## Quick Start

### Prerequisites
- Node.js 18+
- Expo Go app on your Android device, OR Android emulator

### Run

```bash
cd mobile-app
npx expo start
```

Scan the QR code with Expo Go on Android, or press `a` for Android emulator.

### For real device API connection
Edit `src/services/auth.js` and change:
```js
const API_BASE = 'http://YOUR_PC_LOCAL_IP:3001';
```
(Find your IP: `ipconfig` → IPv4 Address)

---

## Key Permissions

| Permission | Why |
|---|---|
| `ACCESS_FINE_LOCATION` | GPS for pothole location & SOS coordinates |
| `ACCESS_BACKGROUND_LOCATION` | Stationary/accident detection while app backgrounded |
| `SEND_SMS` | Emergency SMS to contacts offline |
| `CALL_PHONE` | Direct emergency calls offline |
| `VIBRATE` | SOS countdown haptic feedback |
| `CAMERA` | Pothole photo capture |
| `FOREGROUND_SERVICE` | Background location monitoring |

---

## SOS Without Internet

The entire SOS system works **100% offline** via:
- **Cellular calls** — `tel:108`, `tel:112`, `tel:100`
- **SMS** — via `expo-sms` using cellular network
- **Android emergency dialer** — native system intent
- **Local notifications** — stored on device
- **GPS** — cached last-known location if GPS unavailable

Only server sync (complaint reporting) requires internet — it automatically queues and syncs later.
