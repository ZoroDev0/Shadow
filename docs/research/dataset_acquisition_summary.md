# SHADOW Research: Dataset Acquisition Summary

**Project:** SHADOW (Autonomous Cybersecurity Phishing Detection Engine)  
**Deliverable:** Phase 1 — Dataset Discovery & Acquisition  
**Date:** November 2026  
**Lead Authors:** SHADOW Core Machine Learning & Data Engineering Working Group  

---

## 1. Objective of the Acquisition Phase

The primary goal of this phase was to discover, evaluate, legally verify, and autonomously acquire diverse, high-quality cybersecurity datasets covering:
- **URL lexical and structural features**
- **Webpage HTML DOM trees and form structures**
- **Rendered website screenshot images (visual brand impersonation)**
- **Real-time, zero-day threat intelligence feeds**

All work was designed to execute on our workstation hardware (24 GB RAM, 6 GB RTX 4050 Laptop GPU, 256 GB SSD, Windows, Python 3.11) while strictly preserving a safety reserve of $\ge 35\text{ GB}$ free SSD storage.

---

## 2. Quantitative Acquisition Results

Through automated acquisition scripts executing against verified academic repositories, we successfully ingested and validated the following datasets:

| Dataset | Official Source | File Size | Modality | Samples Acquired | Verification Status | Research Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PhiUSIIL** | UCI ML Repository | 14.66 MB (zip) / 54.2 MB (csv) | URL + 46 Features | **235,795** | SHA-256 Verified, Unzipped | Primary training corpus (lexical/structural baseline) |
| **Zenodo Multimodal V2.0** | Zenodo CERN (21379702) | 1.69 GB (zip) | Screenshots + 18 Features (XLSX) | **60,000 URLs / 7,062 images** | SHA-256 Verified, MD5 Verified | Primary visual-language multimodal fusion |
| **PhreshPhish Bounded Sample** | Hugging Face Hub | 52.78 MB (parquet) | URL + Raw HTML DOM pairs | **1,000** paired samples | SHA-256 Verified | Raw DOM structure & form destination inspection |
| **PhishTank Validated Dump** | PhishTank (Cisco) | 7.95 MB (csv) | URLs + Timestamps + Targets | **43,223** verified phish | SHA-256 Verified | Temporal decay & target brand ground truth |
| **Phishing Websites (327)** | UCI ML Repository | 0.96 MB (zip) / 0.76 MB (arff) | 30 Discrete Features | **11,055** | SHA-256 Verified, Unzipped | Historical benchmark & sanity check baseline |
| **Website Phishing (379)** | UCI ML Repository | 33 KB (zip) / 32 KB (arff) | 9 Discrete Features | **1,353** | SHA-256 Verified, Unzipped | Compact associative rule-mining benchmark |
| **OpenPhish Community Feed** | OpenPhish / GitHub | 13.5 KB (txt) | Live URL Strings | **300** active phish | SHA-256 Verified | Zero-day live threat evaluation |

**Total Confirmed Records Ingested:** **352,726 samples** across tabular, threat intelligence, raw HTML, and visual screenshot modalities.

---

## 3. Storage & Resource Accounting

- **Initial Free SSD Space:** 251.31 GB
- **Current Free SSD Space:** 249.02 GB
- **Total Ingested Data:** ~1.91 GB
- **Storage Safety Reserve:** $\ge 35.0\text{ GB}$ (Maintained with over 214 GB surplus)
- **RAM Footprint:** All raw archives are loaded via streaming or chunked generators; no multi-gigabyte files are kept in memory uncompressed.

---

## 4. Key Findings & Strategic Insights

### 4.1 Feature Richness in Modern URL Data
In inspecting `PhiUSIIL_Phishing_URL_Dataset.csv`, we observed features that move beyond naive character counts:
- `CharContinuationRate`: Quantifies automated script-generated domains.
- `URLTitleMatchScore`: Compares semantic similarity between URL tokens and `<title>` text.
- `TLDLegitimateProb`: Captures historical reputation probabilities across suspicious ccTLDs (`.top`, `.xyz`, `.icu`).

### 4.2 Raw HTML Inspection Without Script Execution
In our static inspection of the PhreshPhish sample, we verified that raw HTML documents can be fully parsed using `BeautifulSoup4` with zero execution risk. We extracted form actions, input names, script counts, and iframe embeddings, showing that external webhook destinations and credential harvesting inputs can be flagged statically before page rendering.

### 4.3 Multimodal Missingness Architecture
Because real-world phishing websites get taken down within hours, multimodal datasets frequently suffer from incomplete screenshot coverage (e.g., 11.77% in Zenodo V2.0). 
We established that:
- A missing screenshot does **not** signify a benign website.
- The SHADOW backend must implement missing-modality dropout during training to remain robust when one or more modalities fail to collect.

---

## 5. Next Steps for Phase 2

1. **Feature Engineering Pipeline (`ml-research/features/`):** Implement production-grade lexical extractors (entropy, continuation rate, digit ratio) and DOM parsers (form action mismatch, hidden input detection).
2. **Domain-Aware Data Splitting (`ml-research/preprocessing/`):** Construct leakage-free train/validation/test splits using `tldextract` Group-KFold cross-validation.
3. **Baseline Model Benchmarking (`ml-research/models/`):** Train and benchmark LightGBM, XGBoost, and Random Forest classifiers on the 235k sample PhiUSIIL dataset.
4. **Multimodal Fusion Architecture (`ml-research/fusion/`):** Integrate visual embeddings from Zenodo V2.0 screenshots with lexical and HTML signals.
