# SHADOW — Autonomous Multimodal Phishing Detection Platform

> **A student-built cybersecurity research initiative investigating multimodal intelligence for phishing and malicious website detection.**

---

## 👥 Core Team & Authors

1. **Sasanka**
2. **Biswajeet**
3. **Riya**
4. **Kaustab**

---

## 1. Project Overview

SHADOW is an end-to-end cybersecurity platform designed to defend users against modern web-based deception attacks, including credential harvesting, brand impersonation, zero-day phishing, and malicious payload distribution.

The system connects three client applications to a unified detection engine:
1. **Chrome Extension** (`apps/extension/` & `extension/`): In-browser extension providing real-time URL lexical evaluation, DOM heuristic scanning, and threat blocking.
2. **Web Application** (`apps/web/` & `web-app/`): Interactive security portal for on-demand URL investigation, security telemetry, and threat reporting.
3. **Android Application** (`apps/android/`): Mobile application protecting users against SMS phishing (smishing) and malicious messaging links.

---

## 2. ML Research & Multimodal Pipeline

Rather than relying purely on URL blacklists or single-modality models, the SHADOW research pipeline (`ml-research/`) explores **multimodal fusion** across four complementary observation layers:
1. **URL Intelligence (Lexical & Structural):** Shannon entropy, token depth, path/query structure, digit ratio, IP usage, and suspicious brand keywords.
2. **HTML DOM Intelligence (Semantic Architecture):** Safe static parsing of forms, password inputs, hidden fields, cross-origin targets, and iframe embedding without executing untrusted JavaScript.
3. **Visual Intelligence (Deep Vision Embeddings):** Rendered webpage screenshots processed via frozen pretrained **MobileNetV3-Small** and **ResNet-18** backbones.
4. **Browser Behaviour Intelligence (Dynamic Telemetry):** Controlled synthetic interaction scenarios modeling redirection hops, cross-origin navigation, and stealth DOM mutations.

---

## 3. End-to-End Research Notebooks

The research pipeline is organized into four sequential, fully reproducible Jupyter notebooks in `ml-research/notebooks/`:

1. **`Dataset Discovery.ipynb` (Phase 1):**
   - Discovery, safe acquisition, and integrity verification across 7 cybersecurity benchmark datasets (PhiUSIIL, UCI 327, UCI 379, PhreshPhish, Zenodo Multimodal, PhishTank, OpenPhish).
2. **`02_Dataset Audit & Preprocessing.ipynb` (Phase 2):**
   - Quality auditing, deduplication, Public Suffix List registered domain extraction (`tldextract`), and mathematical proof of **zero domain leakage** via domain-grouped splitting.
   - Lazy, zero-disk-overhead screenshot decompression for the Zenodo archive.
3. **`03_Feature Engineering & Signal Extraction.ipynb` (Phase 3):**
   - Extraction of 20 URL features, 13 static DOM features, 576-dim visual embeddings on an NVIDIA RTX 4050 GPU, and behavioral telemetry modeling.
4. **`04_Baseline Model Training & Multimodal Evaluation.ipynb` (Phase 4):**
   - Training of the **single unified LightGBM classifier** (`models/shadow_unified_classifier.txt`).
   - Achieves **99.20% Accuracy**, **98.80% Precision**, **98.70% Recall**, and **0.9961 ROC-AUC** with an ultra-low **0.56% False Positive Rate** on the untouched test partition.

---

## 4. Workstation Hardware & Reproducibility Constraints

The SHADOW pipeline is explicitly designed and verified under workstation hardware constraints:
- **CPU & RAM:** 24 GB RAM
- **GPU Accelerator:** NVIDIA GeForce RTX 4050 Laptop GPU (6 GB VRAM, CUDA 12.8)
- **Storage:** 256 GB SSD (maintaining a strict $\ge 35\text{ GB}$ reserve)
- **Operating System:** Windows with Python 3.11 (`.venv`, `shadow-research` Jupyter kernel)

---

## 5. Repository Directory Structure

```
SHADOW/
├── apps/               # Client applications (Chrome extension, Web, Android)
├── artifacts/          # Visual figures, correlation matrices, ROC/PR curves
├── backend/            # FastAPI central detection engine
├── cyber-range/        # Synthetic testing scenarios & telemetry testbeds
├── data/               # Local datasets (excluded from repository)
├── docs/
│   └── research/       # Academic research reports, feature catalogues, audit logs
├── ml-research/
│   ├── notebooks/      # Fully executed Jupyter research notebooks (01 to 04)
│   └── reports/        # Pipeline manifests and verification logs
├── models/             # Trained LightGBM model binary and feature schema
├── scripts/
│   └── development/    # Autonomous acquisition, preprocessing, and model training runners
└── requirements.txt    # Project dependencies
```

---

## 6. Safety & Untrusted Data Protocol

All collected datasets and observed websites are handled under strict ethical cybersecurity controls:
- **No Untrusted Script Execution:** Downloaded HTML pages are parsed statically with `BeautifulSoup` and never rendered in live browser runtimes.
- **No Navigation:** We never send live requests or navigate to discovered phishing URLs.
- **Static Image Decoding:** Webpage screenshots are loaded strictly as 2D pixel matrices in memory via Pillow.
