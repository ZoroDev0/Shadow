# SHADOW Research: Final Model Training & Scientific Evaluation Report

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 4 — Unified Baseline Classifier Training & Multimodal Evaluation  
**Date:** November 2026  
**Artifact Path:** `models/shadow_unified_classifier.txt` (560 KB)  

---

## 1. Executive Summary & Core Results

We have successfully trained and evaluated the **single final unified phishing-detection classifier** for Project SHADOW. The classifier was trained strictly on the domain-isolated `train` split ($N = 15,397$), tuned on the `val` split ($N = 3,725$), and evaluated on the completely untouched `test` split ($N = 2,878$ URLs across 2,626 disjoint registered domains).

### Final Benchmark Performance on Untouched Test Partition:

| Metric | Measured Value | Standard Deviation / Notes |
| :--- | :--- | :--- |
| **Accuracy** | **99.20%** | Overall correct classification across all test samples |
| **Precision** | **98.80%** | High certainty on positive predictions |
| **Recall (Detection Rate)** | **98.70%** | Catches 908 of 920 phishing attacks |
| **F1-Score** | **98.75%** | Harmonic mean of precision and recall |
| **ROC-AUC** | **0.9961** | Outstanding rank-ordering capability |
| **PR-AUC (Average Precision)**| **0.9950** | Evaluates precision across full recall spectrum |
| **False Positive Rate (FPR)**| **0.56%** | Only 11 false alarms out of 1,958 legitimate websites |
| **False Negative Rate (FNR)**| **1.30%** | 12 missed attacks out of 920 zero-day phish |
| **Optimal Threshold ($\tau$)**| **0.27** | Tuned strictly on validation partition |
| **Inference Latency** | **0.003 ms / sample** | Measured on Intel Core i7 CPU |
| **Inference Throughput** | **297,203 samples/sec** | High-throughput batch inference capability |
| **Training Duration** | **1.66 seconds** | Fast convergence (best iteration: 164) |

---

## 2. Confusion Matrix Analysis (Test Partition)

$$\begin{pmatrix} \text{True Negatives (TN)} & \text{False Positives (FP)} \\ \text{False Negatives (FN)} & \text{True Positives (TP)} \end{pmatrix} = \begin{pmatrix} 1,947 & 11 \\ 12 & 908 \end{pmatrix}$$

- **True Negatives ($1,947$):** Legitimate sites correctly permitted without disrupting user browsing.
- **False Positives ($11$):** Benign sites incorrectly flagged. Yields an ultra-low False Alarm Rate of **0.56%**, preventing alert fatigue.
- **False Negatives ($12$):** Evasive phishing sites that slipped past detection. Manual inspection showed these were short, clean cloud URLs without explicit credential keywords.
- **True Positives ($908$):** Malicious phishing attacks successfully intercepted and neutralized.

---

## 3. Modality-Specific Performance Breakdown

To scientifically evaluate how the unified classifier handles heterogeneous real-world scenarios, we segmented test set performance by the client's available observation profile:

| Modality Availability Profile | Test Samples | Phishing Share | Accuracy (%) | Precision (%) | Recall (%) | F1-Score (%) | ROC-AUC |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. URL Only** (PhiUSIIL) | 2,608 | 32.9% | **99.62%** | **99.77%** | **99.07%** | **99.42%** | **0.9964** |
| **2. URL + Static HTML DOM** (PhreshPhish) | 161 | 34.8% | **91.93%** | **85.25%** | **92.86%** | **88.89%** | **0.9658** |
| **3. URL + Visual Screenshot** (Zenodo) | 109 | 5.5% | **100.00%** | **100.00%** | **100.00%** | **100.00%** | **1.0000** |

### Scientific Insights:
1. **URL Modality Baseline:** Extremely accurate ($99.62\%$ F1) on lexical and structural features for standard domain spoofing.
2. **HTML Modality Robustness:** PhreshPhish represents noisy, heterogeneous in-the-wild web pages where attackers employ evasion techniques; the model successfully achieved **$92.86\%$ recall** with an $88.89\%$ F1-score.
3. **Visual Embeddings as a High-Precision Filter:** When rendered screenshots are available, deep visual features from MobileNetV3 provide strong visual confirmation, yielding **$100.0\%$ accuracy** on the held-out visual test partition.

---

## 4. Hardware and Computational Profile

- **Training Compute:** Executed in **1.66 seconds** on CPU.
- **Peak RAM Usage:** ~185 MB during LightGBM dataset creation.
- **GPU Acceleration Utilization:** The NVIDIA GeForce RTX 4050 Laptop GPU was utilized in Phase 3 for MobileNetV3 visual embedding extraction (peak VRAM: **242.8 MB**), producing lightweight compact vectors that allow LightGBM training to proceed rapidly on CPU.
- **Model Disk Size:** **560 KB** (text model format) — ultra-compact, easily distributable to the Chrome Extension or Android app.
