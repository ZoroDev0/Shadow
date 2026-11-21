# SHADOW Research: Feature Extraction Performance & Systems Report

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 3 — Feature Engineering & Signal Extraction  
**Date:** November 2026  
**Hardware Platform:** Intel Core i7 / NVIDIA GeForce RTX 4050 Laptop GPU (6 GB VRAM)  
**Environment:** Python 3.11.9 (`.venv`, `shadow-research` kernel)  

---

## 1. Overview and Operational Requirements

In production, SHADOW will operate across three client surfaces:
1. **Chrome Browser Extension:** Requires ultra-low latency ($<50\text{ ms}$) client-side feature extraction for real-time browsing protection.
2. **Android Client Application:** Requires lightweight memory footprint and battery efficiency.
3. **Central Detection Backend:** Processes high-throughput batch traffic and multimodal fusion.

This report documents the extraction latency, processing throughput, memory consumption, and GPU efficiency measured during our Phase 3 experiments.

---

## 2. Extraction Throughput and Latency Benchmarks

| Modality / Pipeline | Evaluated Samples | Total Processing Time | Extraction Throughput | Per-Sample Latency | Compute Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **URL Intelligence** | 20,000 URLs | 0.54 seconds | **36,846.3 URLs/sec** | **0.027 ms / URL** | Single CPU Core |
| **HTML Intelligence** (DOM Parser) | 1,000 Webpages | 32.89 seconds | **30.4 pages/sec** | **32.89 ms / page** | CPU (BeautifulSoup) |
| **Visual (ResNet-18)** | 1,000 Screenshots | 22.17 seconds | **45.1 images/sec** | **22.17 ms / image** | CUDA (RTX 4050 GPU) |
| **Visual (MobileNetV3)** | 1,000 Screenshots | 18.42 seconds | **54.3 images/sec** | **18.42 ms / image** | CUDA (RTX 4050 GPU) |
| **Synthetic Behaviour** | 2,500 Sessions | 0.08 seconds | **31,250 sessions/sec** | **0.032 ms / session** | CPU In-Memory |

---

## 3. Systems and Hardware Profile

### 3.1 GPU VRAM Allocation (NVIDIA RTX 4050 6 GB)
- **Base PyTorch / CUDA Initialization:** ~310 MB.
- **Model Parameters Loaded in VRAM:**
  - ResNet-18 (Weights + Identity Head): 44.7 MB.
  - MobileNetV3-Small (Weights + Identity Head): 9.8 MB.
- **Batch Processing Buffer (Batch Size = 64, $224 \times 224 \times 3$ FP32):** ~128 MB.
- **Peak VRAM Allocated During Extraction:** **716.8 MB** (Only **11.7%** of the available 6,144 MB VRAM).
- **GPU Temperature & Power:** Remained stable at $<55^\circ\text{C}$ with zero thermal throttling.

### 3.2 Storage Efficiency
- **Zenodo Archive Preservation:** Keeping `Phishing dataset.zip` compressed on disk saved **~6.8 GB** of uncompressed image storage on the SSD.
- **Parquet Vectorized Output Sizes:**
  - `url_features_extracted.parquet` (20,000 rows $\times$ 24 cols): **0.965 MB**
  - `html_features_extracted.parquet` (1,000 rows $\times$ 17 cols): **0.144 MB**
  - `visual_embeddings_sample.parquet` (1,000 rows $\times$ 68 cols): **0.343 MB**
  - `behaviour_features_synthetic.parquet` (2,500 rows $\times$ 11 cols): **0.023 MB**
  - `resnet18_embeddings_1000.npy` ($1000 \times 512$ FP32): **1.953 MB**
  - `mobilenetv3_embeddings_1000.npy` ($1000 \times 576$ FP32): **2.197 MB**

---

## 4. Architectural Feasibility for SHADOW Clients

1. **Chrome Extension (Client-Side):**
   - URL feature extraction executes in **0.027 ms**, completely imperceptible to users during link hover or pre-navigation checks.
   - MobileNetV3-Small can be exported to ONNX / WebGL for in-browser visual classification with $<25\text{ ms}$ inference time.
2. **Android Application:**
   - MobileNetV3-Small's 9.8 MB parameter size makes it ideally suited for edge deployment via TFLite / ONNX Runtime Mobile.
3. **Backend Detection Service:**
   - Capable of sustaining $>35,000\text{ URL checks/sec}$ per node, with GPU-accelerated visual batch processing easily handling $>2,500\text{ screenshots/minute}$ on a modest laptop GPU.
