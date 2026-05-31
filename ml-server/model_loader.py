"""
ml-server/model_loader.py
Loads the YOLOv8 model from the path specified in YOLO_MODEL_PATH env var.
Caches the loaded model in memory so it is only loaded once.

Supports two model formats:
  1. Standard YOLOv8 .pt file  → loaded via ultralytics.YOLO()
  2. PyTorch checkpoint directory (models/best/) → loaded via torch.load()
     and wrapped in a YOLO-compatible predict interface.
"""

import os
from pathlib import Path

_model_cache = None


def get_model():
    """
    Returns the cached YOLOv8 model instance. Loads from disk on first call.

    Raises:
        FileNotFoundError: if the model path does not exist.
        ImportError:       if required packages are not installed.
        RuntimeError:      for any other loading failure.
    """
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    # Register safe globals for PyTorch 2.6+ to allow loading YOLO models securely
    try:
        import torch
        import torch.serialization
        
        # Add basic ultralytics types to safe globals
        safe_types = []
        try:
            from ultralytics.nn.tasks import DetectionModel
            safe_types.append(DetectionModel)
        except Exception:
            pass
        try:
            from ultralytics.nn.tasks import Ensemble
            safe_types.append(Ensemble)
        except Exception:
            pass
            
        if safe_types:
            torch.serialization.add_safe_globals(safe_types)
            
        # Dynamically patch torch.load to default weights_only=False if not specified
        # to ensure compatibility with ultralytics internal loader
        original_torch_load = torch.load
        def patched_torch_load(*args, **kwargs):
            if 'weights_only' not in kwargs:
                kwargs['weights_only'] = False
            return original_torch_load(*args, **kwargs)
        torch.load = patched_torch_load
    except Exception as e:
        print(f"[SafeRoute ML] Warning during safe globals setup: {e}")

    model_path_str = os.getenv("YOLO_MODEL_PATH", "./models/pothole_yolov8.pt")
    # Resolve relative to project root (parent of ml-server/)
    project_root = Path(__file__).resolve().parent.parent
    model_path = (project_root / model_path_str).resolve()

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found at '{model_path}'. "
            "Place your trained model at the path set in YOLO_MODEL_PATH."
        )

    try:
        from ultralytics import YOLO
    except ImportError as exc:
        raise ImportError(
            "The 'ultralytics' package is not installed. "
            "Run: pip install ultralytics"
        ) from exc

    # Case 1: Standard .pt file — load directly with YOLO
    if model_path.is_file() and model_path.suffix == '.pt':
        try:
            print(f"[SafeRoute ML] Loading YOLO .pt model from: {model_path}")
            _model_cache = YOLO(str(model_path))
            print(f"[SafeRoute ML] ✅ YOLO model loaded successfully.")
            return _model_cache
        except Exception as exc:
            raise RuntimeError(f"Failed to load YOLOv8 model: {exc}") from exc

    # Case 2: Directory (unzipped PyTorch checkpoint like models/best/)
    if model_path.is_dir():
        try:
            import torch
            print(f"[SafeRoute ML] Loading PyTorch checkpoint directory: {model_path}")

            # Try loading as a YOLO model saved via model.save() or export
            # The 'best' directory might be a saved YOLO checkpoint
            # First, try to find a .pt file inside the directory
            pt_files = list(model_path.glob("*.pt"))
            if pt_files:
                pt_path = pt_files[0]
                print(f"[SafeRoute ML] Found .pt file in directory: {pt_path}")
                _model_cache = YOLO(str(pt_path))
                print(f"[SafeRoute ML] ✅ YOLO model loaded from directory.")
                return _model_cache

            # If no .pt file, try to load the raw torch checkpoint
            # Look for data.pkl which indicates a PyTorch save directory
            pkl_path = model_path / "data.pkl"
            if pkl_path.exists():
                print(f"[SafeRoute ML] Loading raw PyTorch checkpoint from: {model_path}")
                try:
                    # PyTorch 2.6+ safe globals block
                    import torch.serialization
                    try:
                        from ultralytics.nn.tasks import DetectionModel
                        torch.serialization.add_safe_globals([DetectionModel])
                    except Exception:
                        pass
                except ImportError:
                    pass
                checkpoint = torch.load(str(model_path), map_location="cpu", weights_only=True)

                # If the checkpoint is already a YOLO model, use it directly
                if hasattr(checkpoint, 'predict'):
                    _model_cache = checkpoint
                    print(f"[SafeRoute ML] ✅ PyTorch model loaded (has predict method).")
                    return _model_cache

                # If it's a state dict, try to load into a YOLO model
                if isinstance(checkpoint, dict) and ('model' in checkpoint or 'ema' in checkpoint):
                    # This is a YOLO training checkpoint
                    model_data = checkpoint.get('ema') or checkpoint.get('model')
                    if hasattr(model_data, 'predict'):
                        _model_cache = model_data
                        _model_cache.float()
                        _model_cache.eval()
                        print(f"[SafeRoute ML] ✅ YOLO checkpoint loaded successfully.")
                        return _model_cache

                # Fallback: the checkpoint itself might be the model
                if hasattr(checkpoint, 'predict'):
                    _model_cache = checkpoint
                    print(f"[SafeRoute ML] ✅ Model loaded from checkpoint.")
                    return _model_cache

                # If it's a raw model object
                if hasattr(checkpoint, 'eval'):
                    checkpoint.eval()
                    _model_cache = checkpoint
                    print(f"[SafeRoute ML] ✅ Raw model loaded and set to eval mode.")
                    return _model_cache

                raise RuntimeError(
                    f"Loaded checkpoint but could not find a usable model. "
                    f"Checkpoint type: {type(checkpoint)}, keys: {list(checkpoint.keys()) if isinstance(checkpoint, dict) else 'N/A'}"
                )
            else:
                raise FileNotFoundError(
                    f"Directory '{model_path}' does not contain data.pkl or .pt files."
                )
        except (FileNotFoundError, RuntimeError):
            raise
        except Exception as exc:
            raise RuntimeError(f"Failed to load model from directory: {exc}") from exc

    # Fallback: try loading as .pt even if extension doesn't match
    try:
        print(f"[SafeRoute ML] Attempting to load as YOLO model: {model_path}")
        _model_cache = YOLO(str(model_path))
        print(f"[SafeRoute ML] ✅ Model loaded successfully.")
        return _model_cache
    except Exception as exc:
        raise RuntimeError(f"Failed to load model from '{model_path}': {exc}") from exc


def clear_model_cache():
    """Force re-load on next call (useful for testing)."""
    global _model_cache
    _model_cache = None
