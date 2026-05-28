Place your trained YOLOv8 pothole detection model file here:

  pothole_yolov8.pt

The path is configured via YOLO_MODEL_PATH in your .env file.
Default path: ./models/pothole_yolov8.pt

Training notes:
- Dataset: Custom annotated pothole images (COCO format)
- Base model: YOLOv8n / YOLOv8s recommended for edge inference
- Classes: ["pothole"]
- Input size: 640×640
- Export format: PyTorch .pt (not ONNX)

See README.md → "Model Note" section for details.
