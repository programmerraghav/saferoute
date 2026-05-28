# SafeRoute — AI-Powered Road Safety System

> **YOLOv8 pothole detection + automatic SOS emergency alerts for India's roads.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal)](https://fastapi.tiangolo.com)
[![Azure](https://img.shields.io/badge/Azure-CosmosDB%20%7C%20EventHub-blue)](https://azure.microsoft.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 📋 Project Overview

SafeRoute is a full-stack, AI-powered road safety platform with two core systems:

| System | Technology | What it does |
|---|---|---|
| **Pothole Detection** | YOLOv8 + GPT-4o | Analyses uploaded photos, scores severity 1–10, registers municipal complaints |
| **SOS Emergency Alert** | Twilio + Firebase | Auto-triggers emergency call chain (family → 108 → 100) with GPS sharing |

**Architecture:**
```
Browser (Vanilla JS SPA)
    │
    ▼
Express Backend (Node.js :3000)
    ├── Azure CosmosDB      — complaint & SOS storage
    ├── Azure Event Hub     — real-time event streaming
    ├── Twilio              — SMS + voice call chain
    ├── Firebase FCM        — push notifications to nearby drivers
    ├── GPT-4o              — complaint summary generation
    │
    └── FastAPI ML Server (:8000)
            └── YOLOv8      — pothole detection + severity scoring
```

---

## ✅ Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | ≥ 18.0 | Backend Express server |
| npm | ≥ 9.0 | Package management |
| Python | ≥ 3.10 | FastAPI ML server |
| pip | latest | Python package management |
| Git | any | Version control |

**Cloud services required (keys in `.env`):**
- Azure CosmosDB (NoSQL API)
- Azure Event Hubs
- OpenAI API (GPT-4o)
- Twilio (SMS + Voice)
- Firebase (FCM push notifications)
- Google Maps JavaScript API

---

## 🚀 Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-org/saferoute.git
cd saferoute
```

### 2. Configure environment variables
```bash
# Copy the example env file
cp .env.example .env   # (or rename .env as-is)

# Open .env and fill in all values:
# - OPENAI_API_KEY
# - COSMOS_ENDPOINT + COSMOS_KEY
# - EVENTHUB_CONNECTION_STRING
# - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER
# - GOOGLE_MAPS_API_KEY
# - FIREBASE_SERVER_KEY + FIREBASE_PROJECT_ID
# - JWT_SECRET
```

### 3. Place trained YOLOv8 model weights
```bash
# Copy your trained .pt file to:
models/pothole_yolov8.pt

# Or update YOLO_MODEL_PATH in .env to point to a custom location
```

### 4. Install Node.js backend dependencies
```bash
npm install
```

### 5. Install Python ML server dependencies
```bash
pip install -r ml-server/requirements.txt
```

### 6. Start the backend server
```bash
npm run dev
# Server starts at http://localhost:3000
```

### 7. Start the ML server (separate terminal)
```bash
# From the saferoute/ project root:
uvicorn ml-server.main:app --reload --port 8000

# Or from inside ml-server/:
cd ml-server
uvicorn main:app --reload --port 8000
```

### 8. Open the application
Navigate to **http://localhost:3000** in your browser.

---

## 📡 API Reference

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server health check |
| `GET` | `http://localhost:8000/health` | ML server health |

---

### Complaints

#### `POST /api/complaints/register`
Register a new pothole complaint with AI analysis.

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|---|---|---|---|
| `image` | File | ✅ | Pothole photo (JPEG/PNG/WebP, max 10 MB) |
| `user_name` | string | ✅ | Reporter's name |
| `location_coords` | JSON string | ✅ | `{"lat": 20.3893, "lng": 72.9106}` |
| `vehicle_type` | string | | `"car"` or `"bike"` |
| `description` | string | | Optional description |
| `road_name` | string | | Optional road/area name |

**Response `201`:**
```json
{
  "complaint_id": "CMP-A1B2C3D4",
  "severity": 7,
  "pothole_type": "large",
  "confidence": 0.8743,
  "confirmed": true,
  "bbox": [120.5, 80.2, 340.1, 260.8],
  "ai_summary": "A large pothole with severity 7/10 has been detected...",
  "status": "pending",
  "message": "Complaint registered. Municipality alerted..."
}
```

---

#### `GET /api/complaints/:id`
Fetch a single complaint by ID.

**Response `200`:** Full complaint document from CosmosDB.

---

#### `GET /api/complaints?lat=&lng=&radius=`
Fetch all complaints within a radius (metres) of GPS coordinates.

| Param | Type | Required | Default |
|---|---|---|---|
| `lat` | float | ✅ | — |
| `lng` | float | ✅ | — |
| `radius` | float | | `1000` (1 km) |

**Response `200`:**
```json
{ "count": 5, "complaints": [...] }
```

---

#### `PATCH /api/complaints/:id/status`
Update complaint status (municipality use).

**Request body:**
```json
{ "status": "in_progress" }
```
Allowed values: `"pending"`, `"in_progress"`, `"resolved"`

---

### SOS

#### `POST /api/sos/trigger`
Trigger an emergency SOS alert.

**Request body:**
```json
{
  "user_name": "Raghav Sharma",
  "location_coords": { "lat": 20.3893, "lng": 72.9106 },
  "vehicle_type": "bike",
  "contact_phone": "+919876543210"
}
```

**Response `201`:**
```json
{
  "sos_id": "SOS-AB123456",
  "status": "triggered",
  "cancel_window_seconds": 10,
  "cancel_window_expires": "2025-01-01T12:00:10.000Z",
  "contacts_alerted": ["+919876543210", "108", "100"],
  "message": "SOS activated. Emergency contacts being alerted..."
}
```

> **Note:** The response is returned immediately. The 4-step call chain (family SMS, family call, 108 log, 100 log) runs asynchronously after the response.

---

#### `POST /api/sos/cancel`
Cancel an active SOS within the cancel window.

**Request body:**
```json
{ "sos_id": "SOS-AB123456" }
```

**Response `200`:**
```json
{ "cancelled": true, "sos_id": "SOS-AB123456", "cancelled_at": "..." }
```

**Response `409` (window expired):**
```json
{ "error": "cancel_window_expired", "message": "Cancel window expired..." }
```

---

#### `GET /api/sos/:id`
Fetch SOS event details.

---

### Alerts

#### `POST /api/alerts/nearby`
Send Firebase push notifications to nearby drivers.

**Request body:**
```json
{
  "location_coords": { "lat": 20.3893, "lng": 72.9106 },
  "vehicle_type": "car",
  "complaint_id": "CMP-A1B2C3D4",
  "severity": 8,
  "tokens": ["fcm-device-token-1", "fcm-device-token-2"]
}
```

**Response `200`:**
```json
{ "notified_count": 2, "radius_meters": 80, "vehicle_type": "car", "complaint_id": "..." }
```

---

### Dashboard

#### `GET /api/dashboard/complaints`
All complaints for map rendering.

| Query Param | Example | Description |
|---|---|---|
| `status` | `pending` | Filter by status |
| `severity_min` | `7` | Minimum severity score |

---

#### `GET /api/dashboard/hotspots`
Top 10 worst road segments clustered by 1 km grid cells.

**Response `200`:**
```json
{
  "count": 5,
  "hotspots": [
    {
      "lat": 20.3893,
      "lng": 72.9106,
      "complaint_count": 12,
      "avg_severity": 7.8,
      "road_name": "NH-48 near Vapi Station"
    }
  ]
}
```

---

#### `GET /api/dashboard/stats`
Aggregate statistics for the municipality dashboard.

**Response `200`:**
```json
{
  "total_complaints": 48,
  "resolved": 15,
  "pending": 23,
  "in_progress": 10,
  "total_sos_events": 7,
  "avg_severity": 5.4,
  "top_affected_area": "NH-48"
}
```

---

## 🤖 Model Note

Place your trained YOLOv8 pothole detection weights at:
```
saferoute/models/pothole_yolov8.pt
```

The path is configured via `YOLO_MODEL_PATH` in `.env`. The ML server loads the model at startup and caches it in memory. If the file is missing, the server starts but returns an error on `/analyze-image` requests.

**Model requirements:**
- Framework: [Ultralytics YOLOv8](https://docs.ultralytics.com/)
- Format: PyTorch `.pt`
- Single class: `pothole`
- Input: 640×640 pixels (auto-resized)

---

## 👥 Team

| Name | Role |
|---|---|
| **Abhinav** | Voice AI & Alert System |
| **Davik** | SOS Framework & Backend APIs |
| **Mahima** | UI/UX Design |
| **Mihika** | ML / Dataset & Model Training |
| **Anuj** | Graphics, Branding & PPT |
| **Raghav** | Lead · Architecture · Security · QA |

---

## 🚨 Emergency Numbers

| Service | Number |
|---|---|
| 🚑 Ambulance | **108** |
| 🚔 Police | **100** |

---

*Built for public road safety · 2025 · India*
