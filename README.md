# 🛣️ SafeRoute — AI-Powered Road Safety System

<div align="center">

> **🚨 YOLOv8 Pothole Detection + Automatic SOS Emergency Alerts for India's Roads**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-teal?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Azure](https://img.shields.io/badge/Azure-CosmosDB%20%7C%20EventHub-0078D4?style=flat-square&logo=microsoft-azure)](https://azure.microsoft.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 📋 Overview

**SafeRoute** is a full-stack, AI-powered road safety ecosystem designed to protect India's commuters. It combines cutting-edge computer vision with intelligent emergency response systems to create a safer road environment for everyone.

---

## ⚡ Core Features

<table>
<tr>
<td>

### 🔍 **Pothole Detection Engine**
Advanced YOLOv8 AI model that:
- ✅ Analyzes uploaded road photos
- ✅ Scores severity (1–10)
- ✅ Auto-files municipal complaints
- ✅ Provides confidence metrics

</td>
<td>

### 🚨 **Emergency SOS Chain**
Intelligent emergency response system:
- ✅ Auto-triggers family SMS
- ✅ Routes emergency calls (108/100)
- ✅ Real-time GPS sharing
- ✅ Firebase push to nearby drivers

</td>
</tr>
</table>

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────┐
│          Browser (Vanilla JS SPA)               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│   Express Backend (Node.js) :3000               │
├─────────────────────────────────────────────────┤
│  ✦ Azure CosmosDB      → Complaint Storage      │
│  ✦ Azure Event Hub     → Real-time Streaming   │
│  ✦ Twilio              → SMS + Voice Chain     │
│  ✦ Firebase FCM        → Push Notifications    │
│  ✦ OpenAI GPT-4o       → Summary Generation    │
│  ✦ Google Maps API     → Location Services     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│   FastAPI ML Server :8000                       │
├─────────────────────────────────────────────────┤
│  • YOLOv8 Detection Engine                      │
│  • Pothole Classification & Severity Scoring    │
│  • Real-time Image Analysis                     │
└─────────────────────────────────────────────────┘
```

| System | Technology | Function |
|---|---|---|
| **Pothole Detection** | YOLOv8 + GPT-4o | Analyzes photos, scores severity 1–10, registers complaints |
| **SOS Emergency Alert** | Twilio + Firebase | Auto-triggers emergency call chain with GPS sharing |

---

## ✅ Prerequisites

### 🛠️ Required Tools

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.0 | Backend Express server runtime |
| **npm** | ≥ 9.0 | Node package manager |
| **Python** | ≥ 3.10 | FastAPI ML server runtime |
| **pip** | latest | Python package manager |
| **Git** | any | Version control system |

### ☁️ Required Cloud Services

You'll need accounts and API keys for:

| Service | Purpose | Notes |
|---|---|---|
| 🔷 **Azure CosmosDB** | Document database for complaints & SOS | NoSQL API required |
| 🔷 **Azure Event Hubs** | Real-time event streaming | For data pipeline |
| 🤖 **OpenAI GPT-4o** | AI-powered complaint summaries | API key required |
| 📱 **Twilio** | SMS & voice emergency calls | Account SID + Auth Token |
| 🔥 **Firebase** | Push notifications to drivers | Server key + Project ID |
| 🗺️ **Google Maps** | Location services & geocoding | JavaScript API key |

---

## 🚀 Quick Start Guide

### Step 1️⃣ Clone the Repository
```bash
git clone https://github.com/programmerraghav/saferoute.git
cd saferoute
```

### Step 2️⃣ Configure Environment Variables
```bash
# Copy the environment template
cp .env.example .env

# ⚠️ Edit .env and fill in all required values:
# OPENAI_API_KEY=your_key_here
# COSMOS_ENDPOINT=https://your-db.documents.azure.com:443/
# COSMOS_KEY=your_key_here
# EVENTHUB_CONNECTION_STRING=Endpoint=sb://...
# TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_AUTH_TOKEN=your_token_here
# TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
# GOOGLE_MAPS_API_KEY=your_key_here
# FIREBASE_SERVER_KEY=your_key_here
# FIREBASE_PROJECT_ID=your_project_id
# JWT_SECRET=your_secret_key_here
```

### Step 3️⃣ Place YOLOv8 Model Weights
```bash
# Add your trained YOLOv8 weights to:
cp /path/to/your/pothole_model.pt models/best.pt

# Or update YOLO_MODEL_PATH in .env to point to custom location
```

### Step 4️⃣ Install Dependencies

**Backend dependencies:**
```bash
npm install
```

**ML server dependencies:**
```bash
pip install -r ml-server/requirements.txt
```

### Step 5️⃣ Start the Backend Server
```bash
npm run dev
# 🚀 Server running at http://localhost:3000
```

### Step 6️⃣ Start the ML Server (in a separate terminal)
```bash
# Option A: From project root
uvicorn ml-server.main:app --reload --port 8000

# Option B: From ml-server directory
cd ml-server && uvicorn main:app --reload --port 8000

# 🤖 ML Server running at http://localhost:8000
```

### Step 7️⃣ Open the Application
Navigate to **http://localhost:3000** in your browser 🎉

---

## 📡 API Reference

### 💚 Health Checks

Check if services are running:

| Method | Endpoint | Response |
|---|---|---|
| `GET` | `/api/health` | Backend server status |
| `GET` | `http://localhost:8000/health` | ML server status |

---

### 📸 Complaints API

#### `POST /api/complaints/register`
**Register a new pothole complaint with AI analysis**

🔹 **Request Format:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | File | ✅ | Pothole photo (JPEG/PNG/WebP, ≤10MB) |
| `user_name` | string | ✅ | Reporter's full name |
| `location_coords` | JSON | ✅ | `{"lat": 20.3893, "lng": 72.9106}` |
| `vehicle_type` | string | ⭕ | `"car"` or `"bike"` |
| `description` | string | ⭕ | Optional pothole details |
| `road_name` | string | ⭕ | Optional road/area name |

🔹 **Response `201` (Success):**
```json
{
  "complaint_id": "CMP-A1B2C3D4",
  "severity": 7,
  "pothole_type": "large",
  "confidence": 0.8743,
  "confirmed": true,
  "bbox": [120.5, 80.2, 340.1, 260.8],
  "ai_summary": "A large pothole with severity 7/10...",
  "status": "pending",
  "message": "✅ Complaint registered. Municipality alerted!"
}
```

---

#### `GET /api/complaints/:id`
**Fetch a specific complaint**

🔹 **Response `200`:** Complete complaint document

---

#### `GET /api/complaints?lat=&lng=&radius=`
**Find all complaints near a location**

| Parameter | Type | Required | Default |
|---|---|---|---|
| `lat` | float | ✅ | — |
| `lng` | float | ✅ | — |
| `radius` | float | ⭕ | `1000` (1 km) |

🔹 **Response `200`:**
```json
{
  "count": 5,
  "complaints": [...]
}
```

---

#### `PATCH /api/complaints/:id/status`
**Update complaint status (municipality)**

| Status | Meaning |
|---|---|
| `pending` | Awaiting review |
| `in_progress` | Repair work started |
| `resolved` | Repair completed |

🔹 **Request Body:**
```json
{ "status": "in_progress" }
```

---

### 🚨 SOS Emergency API

#### `POST /api/sos/trigger`
**Activate emergency SOS alert**

Immediately triggers the 4-step emergency response chain!

🔹 **Request Body:**
```json
{
  "user_name": "Raghav Sharma",
  "location_coords": { "lat": 20.3893, "lng": 72.9106 },
  "vehicle_type": "bike",
  "contact_phone": "+919876543210"
}
```

🔹 **Response `201` (Triggered):**
```json
{
  "sos_id": "SOS-AB123456",
  "status": "triggered",
  "cancel_window_seconds": 10,
  "cancel_window_expires": "2025-01-01T12:00:10.000Z",
  "contacts_alerted": ["+919876543210", "108", "100"],
  "message": "🚨 SOS activated! Emergency contacts being alerted..."
}
```

> ⏱️ **Note:** Response returns immediately. The 4-step emergency call chain runs asynchronously:
> 1. SMS to family contact
> 2. Voice call to family
> 3. Automatic log to 108 (Ambulance)
> 4. Automatic log to 100 (Police)

---

#### `POST /api/sos/cancel`
**Cancel active SOS within the window**

🔹 **Request Body:**
```json
{ "sos_id": "SOS-AB123456" }
```

🔹 **Response `200` (Cancelled):**
```json
{
  "cancelled": true,
  "sos_id": "SOS-AB123456",
  "cancelled_at": "2025-01-01T12:00:05.000Z"
}
```

🔹 **Response `409` (Window Expired):**
```json
{
  "error": "cancel_window_expired",
  "message": "⏰ Cancel window has expired. Emergency services already alerted."
}
```

---

#### `GET /api/sos/:id`
**Retrieve SOS event details**

Returns full SOS event history and status

---

### 🔔 Alerts API

#### `POST /api/alerts/nearby`
**Send Firebase push notifications to nearby drivers**

Alert drivers in the area about a new pothole hazard!

🔹 **Request Body:**
```json
{
  "location_coords": { "lat": 20.3893, "lng": 72.9106 },
  "vehicle_type": "car",
  "complaint_id": "CMP-A1B2C3D4",
  "severity": 8,
  "tokens": ["fcm-device-token-1", "fcm-device-token-2"]
}
```

🔹 **Response `200` (Success):**
```json
{
  "notified_count": 2,
  "radius_meters": 80,
  "vehicle_type": "car",
  "complaint_id": "CMP-A1B2C3D4"
}
```

---

### 📊 Dashboard API

#### `GET /api/dashboard/complaints`
**Get all complaints for map rendering**

| Query Param | Example | Effect |
|---|---|---|
| `status` | `pending` | Filter by status |
| `severity_min` | `7` | Show only high severity |

---

#### `GET /api/dashboard/hotspots`
**Get top 10 hazardous road segments**

Data is clustered into 1 km × 1 km grid cells for heatmap visualization.

🔹 **Response `200`:**
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
**Get aggregate municipality statistics**

🔹 **Response `200`:**
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
