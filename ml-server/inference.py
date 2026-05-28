"""
ml-server/inference.py
Runs YOLOv8 detection on an uploaded image and maps the result to a
structured severity score from 1-10.

Severity mapping:
  bbox area < 2000 px²   → severity 1-3  (small)
  bbox area 2000-8000 px² → severity 4-6 (medium)
  bbox area > 8000 px²    → severity 7-10 (large)
"""

import os
import io
import numpy as np
from PIL import Image


def _area_to_severity(area: float, confidence: float) -> int:
    """
    Map bounding-box area (px²) + YOLO confidence to a severity score 1-10.

    The confidence boosts the score within each tier:
        tier_score + round((confidence - 0.55) / 0.45 * tier_range)
    """
    threshold = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.55"))

    if area < 2000:
        # small: 1-3
        base, max_score = 1, 3
    elif area <= 8000:
        # medium: 4-6
        base, max_score = 4, 6
    else:
        # large: 7-10
        base, max_score = 7, 10

    tier_range = max_score - base
    # Normalise confidence from [threshold, 1.0] → [0, 1]
    conf_norm = min(max((confidence - threshold) / max(1.0 - threshold, 1e-6), 0.0), 1.0)
    boost = round(conf_norm * tier_range)
    return int(min(base + boost, max_score))


def _area_to_type(area: float) -> str:
    if area < 2000:
        return "small"
    elif area <= 8000:
        return "medium"
    return "large"


def run_inference(model, image_bytes: bytes) -> dict:
    """
    Run YOLOv8 detection on the supplied raw image bytes.

    Args:
        model:       Loaded YOLO model instance (from model_loader).
        image_bytes: Raw bytes of the uploaded image file.

    Returns:
        dict with keys: confirmed, severity, confidence, pothole_type, bbox
    """
    threshold = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.55"))

    # Decode image
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)

    # Run YOLO prediction (verbose=False suppresses per-image console logs)
    results = model.predict(source=img_array, conf=threshold, verbose=False)

    if not results or len(results) == 0:
        return {
            "confirmed": False,
            "severity": 0,
            "confidence": 0.0,
            "pothole_type": "none",
            "bbox": None,
        }

    result = results[0]

    # No detections above threshold
    if result.boxes is None or len(result.boxes) == 0:
        return {
            "confirmed": False,
            "severity": 0,
            "confidence": 0.0,
            "pothole_type": "none",
            "bbox": None,
        }

    # Pick the detection with highest confidence
    confidences = result.boxes.conf.cpu().numpy()
    best_idx = int(np.argmax(confidences))
    best_conf = float(confidences[best_idx])

    # Bounding box in xyxy format
    xyxy = result.boxes.xyxy.cpu().numpy()[best_idx]
    x1, y1, x2, y2 = float(xyxy[0]), float(xyxy[1]), float(xyxy[2]), float(xyxy[3])
    width = x2 - x1
    height = y2 - y1
    area = width * height

    severity = _area_to_severity(area, best_conf)
    pothole_type = _area_to_type(area)

    return {
        "confirmed": True,
        "severity": severity,
        "confidence": round(best_conf, 4),
        "pothole_type": pothole_type,
        "bbox": [round(x1, 1), round(y1, 1), round(x2, 1), round(y2, 1)],
    }
