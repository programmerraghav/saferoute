"""
ml-server/main.py
FastAPI server exposing POST /analyze-image for YOLOv8 pothole detection.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load .env from project root (two levels up from ml-server/)
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

from model_loader import get_model
from inference import run_inference

app = FastAPI(
    title="SafeRoute ML Server",
    description="YOLOv8 pothole detection endpoint",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Pre-load the model at startup so the first request isn't slow."""
    print("[SafeRoute ML] Starting up — loading YOLOv8 model...")
    try:
        get_model()
        print("[SafeRoute ML] ✅ Model loaded and ready.")
    except Exception as exc:
        print(f"[SafeRoute ML] ⚠️  Model not loaded at startup: {exc}")
        print("[SafeRoute ML]    Place your .pt file at the path set in YOLO_MODEL_PATH.")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "SafeRoute ML Server"}


@app.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """
    Accept a multipart image upload and return pothole detection results.

    Returns:
        {
          "confirmed": bool,
          "severity": int (1-10),
          "confidence": float (0.0-1.0),
          "pothole_type": "small" | "medium" | "large",
          "bbox": [x1, y1, x2, y2] or null
        }
    """
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG, PNG, or WebP.",
        )

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=422, detail="Uploaded file is empty.")

    try:
        model = get_model()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Model unavailable: {exc}",
        )

    try:
        result = run_inference(model, image_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {exc}",
        )

    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
