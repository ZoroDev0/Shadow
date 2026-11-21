# SHADOW Research: Dataset Inventory & File System Manifest

**Project:** SHADOW (Student-Built Phishing Detection Platform)  
**Date:** November 2026  
**Status:** Verified Local Artifacts (Phase 1 Complete)  
**Storage Path:** `data/raw/` (relative to project root)  

---

## 1. Storage Health & Safety Reserve Check

Before and throughout dataset acquisition, the SHADOW research pipeline checked system storage to comply with our hardware constraint ($\ge 35\text{ GB}$ reserve):

```
Storage Drive: C:\ (256 GB NVMe SSD)
Total Storage: 474.71 GB
Used Storage:  225.69 GB
Free Storage:  249.02 GB
Safety Reserve Requirement: 35.00 GB
Safety Reserve Status: SATISFIED (214.02 GB surplus above reserve)
```

---

## 2. Inventory of Acquired & Verified Datasets

### 2.1 PhiUSIIL Phishing URL Dataset (Primary Training Corpus)
- **Directory:** `data/raw/uci_phiusiil/`
- **Source:** UCI Machine Learning Repository (ID: 967)
- **Archive File:** `phiusiil_phishing_url_dataset.zip` (15,376,007 bytes / 14.66 MB)
- **Extracted File:** `PhiUSIIL_Phishing_URL_Dataset.csv` (56,854,345 bytes / 54.22 MB)
- **Integrity (SHA-256):**
  - `phiusiil_phishing_url_dataset.zip`: `0a639fd03aea6308c5b1c10c92aa23c2ce1505447a9137271865cd0badc9a59a`
  - `PhiUSIIL_Phishing_URL_Dataset.csv`: `7da0a09e0ee25f38dc2ec122851cf57df6338b813b2e537e295e868a2024ae6f`
- **Instance Count:** 235,795 rows
- **Feature Count:** 54 columns (46 extracted features, ID, URL string, and binary label `0 = Phishing, 1 = Legitimate`)
- **Class Breakdown:**
  - Legitimate (`1`): 134,850 (57.19%)
  - Phishing (`0`): 100,945 (42.81%)
- **Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)

---

### 2.2 Zenodo Phishing & Legitimate Websites V2.0 (Multimodal Vision Corpus)
- **Directory:** `data/raw/zenodo_multimodal/`
- **Source:** Zenodo CERN (DOI: `10.5281/zenodo.21379702`)
- **Archive File:** `Phishing dataset.zip` (1,775,761,857 bytes / 1.69 GB)
- **Integrity (SHA-256):** `b7984b813b085395413025f00b78347595275012dfd012efbed4c474d41ff2dc`
- **Official Zenodo MD5:** `85937228498c1efffb2ee497389482a2` (Verified Match)
- **Scope:** 7,076 items inside archive, including 60,000 URLs, 18 lexical features (CSV), and thousands of rendered webpage screenshots (PNG) organized by class (`test/legitimate`, `test/phishing`, `train/`)
- **Licence:** CC BY 4.0
- **Research Role:** Core visual-language multimodal fusion benchmark

---

### 2.3 PhreshPhish Bounded HTML-URL Sample (DOM Structure Corpus)
- **Directory:** `data/raw/phreshphish_sample/`
- **Source:** Hugging Face (`phreshphish/phreshphish`) / arXiv:2507.10854
- **Data File:** `test-000.parquet` (55,340,975 bytes / 52.78 MB)
- **Integrity (SHA-256):** `9ae7908b64cc75669e4be4cbd0fec884ac2b3f4984211eacfbf013a2ada12851`
- **Instance Count:** 1,000 verified rows (balanced URL-HTML pairs)
- **Captured Columns:** `sha256`, `url`, `label`, `target`, `date`, `lang`, `lang_score`, `html`
- **Licence:** CC BY 4.0 (Anti-phishing research only)
- **Research Role:** Multimodal raw HTML DOM structure and external asset leakage analysis

---

### 2.4 PhishTank Validated Online Phishing Database
- **Directory:** `data/raw/phishtank/`
- **Source:** PhishTank (Cisco OpenDNS)
- **Data File:** `online-valid.csv` (8,334,522 bytes / 7.95 MB)
- **Integrity (SHA-256):** `65fb290a9a5f9b1ebf471b88cc0390da9d8ca293b2d447c1b3b32594e5007b10`
- **Instance Count:** 43,223 verified active phishing URLs
- **Features Captured:** `phish_id`, `url`, `phish_detail_url`, `submission_time`, `verified`, `verification_time`, `online`, `target`
- **Licence:** PhishTank Developer Terms
- **Research Role:** Brand targeting ground truth and temporal attack decay analysis

---

### 2.5 OpenPhish Community Real-Time Feed
- **Directory:** `data/raw/openphish/`
- **Source:** OpenPhish / GitHub Mirror
- **Data File:** `feed.txt` (13,534 bytes / 13.2 KB)
- **Integrity (SHA-256):** `c190f2d420693d292b634d34d513aedab3fdcc3090cef273c5347f8a32ad157e`
- **Instance Count:** 300 active zero-day phishing URLs
- **Modalities:** Live in-the-wild URL strings
- **Licence:** OpenPhish Community License (Free for academic research)
- **Research Role:** Real-time zero-day evaluation benchmark

---

### 2.6 UCI Phishing Websites Dataset (Classical Baseline)
- **Directory:** `data/raw/uci_phishing_websites/`
- **Source:** UCI Machine Learning Repository (ID: 327)
- **Archive File:** `phishing_websites.zip` (1,011,184 bytes / 0.96 MB)
- **Extracted Files:** `Training Dataset.arff` (800,920 bytes), `Phishing Websites Features.docx`, `.old.arff`
- **Integrity (SHA-256):** `514f582cb44cba17251baf1d59f64cddff16efa2b644d091ce8d2a1e8d492940`
- **Instance Count:** 11,055 rows (30 features)
- **Licence:** CC BY 4.0
- **Research Role:** Classical benchmark sanity check

---

### 2.7 UCI Website Phishing Dataset (Compact Rule Benchmark)
- **Directory:** `data/raw/uci_website_phishing/`
- **Source:** UCI Machine Learning Repository (ID: 379)
- **Archive File:** `website_phishing.zip` (33,767 bytes / 33 KB)
- **Extracted File:** `PhishingData.arff` (33,635 bytes)
- **Integrity (SHA-256):** `fa029c3b079b6bfb4f0833c0ec94a778a20522161b028273e81ac3b93ee8bfee`
- **Instance Count:** 1,353 rows (9 features)
- **Licence:** CC BY 4.0
- **Research Role:** Compact associative rule-mining benchmark

---

## 3. Storage Accounting Summary

| Category | Allocated Disk Space | Percentage of Total Storage |
| :--- | :--- | :--- |
| **Tabular Datasets (PhiUSIIL, UCI 327, UCI 379)** | ~73.0 MB | 0.015% |
| **Threat Intelligence Feeds (PhishTank, OpenPhish)** | ~8.35 MB | 0.002% |
| **Multimodal Raw HTML (PhreshPhish Sample)** | ~52.8 MB | 0.011% |
| **Multimodal Vision Screenshots (Zenodo V2.0)** | ~1.78 GB | 0.375% |
| **Total Acquired Data** | **~1.91 GB** | **0.403%** |
| **Remaining Free Space** | **~249.0 GB** | **52.4%** |
| **Mandatory Reserve ($\ge 35\text{ GB}$)** | **PRESERVED** | **Surplus: ~214.0 GB** |
