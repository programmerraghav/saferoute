"""
ml-server/model_loader.py
Loads the YOLOv8 model from the path specified in YOLO_MODEL_PATH env var.
Caches the loaded model in memory so it is only loaded once.
"""

import os
from pathlib import Path

_model_cache = None


def get_model():
    """
    Returns the cached YOLOv8 model instance. Loads from disk on first call.

    Raises:
        FileNotFoundError: if the .pt file does not exist at YOLO_MODEL_PATH.
        ImportError:       if the `ultralytics` package is not installed.
        RuntimeError:      for any other loading failure.
    """
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    model_path_str = os.getenv("YOLO_MODEL_PATH", "./models/pothole_yolov8.pt")
    # Resolve relative to project root (parent of ml-server/)
    project_root = Path(__file__).resolve().parent.parent
    model_path = (project_root / model_path_str).resolve()

    if not model_path.exists():
        raise FileNotFoundError(
            f"YOLOv8 model file not found at '{model_path}'. "
            "Place your trained pothole_yolov8.pt at the path set in YOLO_MODEL_PATH."
        )

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise ImportError(
            "The 'ultralytics' package is not installed. "
            "Run: pip install ultralytics"
        ) from exc

    try:
        print(f"[SafeRoute ML] Loading model from: {model_path}")
        _model_cache = YOLO(str(model_path))
        print(f"[SafeRoute ML] ✅ Model loaded successfully.")
        return _model_cache
    except Exception as exc:
        raise RuntimeError(f"Failed to load YOLOv8 model: {exc}") from exc


def clear_model_cache():
    """Force re-load on next call (useful for testing)."""
    global _model_cache
    _model_cache = None
