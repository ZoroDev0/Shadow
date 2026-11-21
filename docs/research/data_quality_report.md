# SHADOW Research: Data Quality and Integrity Audit Report

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 2 — Dataset Cleaning, Quality Auditing & Preprocessing  
**Date:** November 2026  
**Auditor:** Lead ML Research Assistant  

---

## 1. Executive Summary

This report documents the rigorous data quality audit conducted across all approved static datasets and supplementary threat intelligence feeds in Project SHADOW. The goal of this audit is to ensure that our upcoming machine learning models are trained on clean, structurally sound, and accurately labeled data, while identifying missing values, class imbalances, malformed records, and cross-dataset contamination before feature engineering begins.

### Key Quality Metrics at a Glance

| Dataset Identifier | Primary Modality | Total Records | Valid / Audited Records | Missing Values | Duplicate Records | Class Distribution | Quality Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PhiUSIIL** | Tabular + URL | 235,795 | 235,795 | 0 (0.00%) | 425 URL duplicates | 57.0% Legit / 43.0% Phish | **Exceptional** (Production Benchmark) |
| **UCI 327** | Tabular (Lexical/Content) | 11,055 | 11,055 | 0 (0.00%) | 0 (Normalized) | 55.7% Legit / 44.3% Phish | **High** (Standard Classical Benchmark) |
| **UCI 379** | Tabular (Extracted) | 1,353 | 1,353 | 0 (0.00%) | 0 (Normalized) | 51.9% Legit / 48.1% Phish/Susp | **Good** (Compact Web-Page Feature Set) |
| **PhreshPhish (Sample)** | URL + HTML DOM | 1,000 | 1,000 | 0 (0.00%) | 0 (in sample) | 100% Verified Phishing | **High** (Multimodal HTML Research Corpus) |
| **Zenodo V2.0** | Tabular + URL + Image | 60,000 | 60,000 | 0 (in features) | 0 (Unique rows) | 52.8% Legit / 47.2% Phish | **High** (7,062 Verified Screenshot Pairs) |
| **PhishTank** | Live Feed (URL Only) | 43,223 | 43,223 | 0 (0.00%) | 0 (in feed) | 100% Active Phishing | **High** (Threat Intelligence Quarantine) |
| **OpenPhish** | Live Feed (URL Only) | 300 | 300 | 0 (0.00%) | 0 (in feed) | 100% Zero-Day Phishing | **High** (Zero-Day Out-of-Distribution Eval) |

---

## 2. Dataset-by-Dataset Integrity Analysis

### 2.1 PhiUSIIL Phishing URL Dataset
- **Raw File:** `data/raw/phiusiil_phishing_url_dataset.csv` (235,795 rows $\times$ 56 columns).
- **Missing Values:** Exactly 0 across all 56 features.
- **Duplicate Analysis:** We identified 425 duplicate raw URLs. In all 425 cases, the labels were consistent across duplicates (no label conflicts). These duplicate occurrences represent identical URLs logged across different sampling sweeps in the original study.
- **Registered Domain Extraction:** Using Public Suffix List parsing (`tldextract`), we extracted 175,352 unique registered domains.
- **Label Encoding:** Original column `label` encoded as $1$ (Legitimate) and $0$ (Phishing). Standardized to SHADOW's universal target `is_phishing` ($1 = \text{Phishing}, 0 = \text{Legitimate}$).
  - Legitimate (`is_phishing = 0`): 134,850 (57.19%)
  - Phishing (`is_phishing = 1`): 100,945 (42.81%)
- **Verdict:** Highly reliable, large-scale benchmark suitable as SHADOW's primary lexical and statistical URL baseline.

### 2.2 UCI ML Repository (ID 327: Phishing Websites)
- **Raw File:** `data/raw/uci_phishing_websites_327.arff` (11,055 rows $\times$ 31 columns).
- **Missing Values:** Exactly 0 missing values.
- **Feature Structure:** 30 categorical/discrete features pre-binned into values $\{-1, 0, 1\}$.
- **Label Encoding:** Original `Result` column ($1 = \text{Legitimate}, -1 = \text{Phishing}$). Standardized to `is_phishing`:
  - Legitimate (`is_phishing = 0`): 6,157 (55.69%)
  - Phishing (`is_phishing = 1`): 4,898 (44.31%)
- **Verdict:** Clean classical benchmark for testing tabular and tree-based decision models (Random Forest, XGBoost).

### 2.3 UCI ML Repository (ID 379: Website Phishing)
- **Raw File:** `data/raw/uci_website_phishing_379.arff` (1,353 rows $\times$ 10 columns).
- **Missing Values:** Exactly 0 missing values.
- **Feature Structure:** 9 categorical features representing URL and HTML anchor properties with ternary values $\{-1, 0, 1\}$.
- **Label Encoding:** Original `Result` column ($1 = \text{Legitimate}, 0 = \text{Suspicious}, -1 = \text{Phishing}$). Standardized to `is_phishing`:
  - Legitimate (`is_phishing = 0`): 702 (51.88%)
  - Suspicious / Phishing (`is_phishing = 1`): 651 (48.12%)
- **Verdict:** High-precision, compact dataset useful for quick prototype validation and sanity checking rule-based heuristics.

### 2.4 PhreshPhish HTML Dataset (Curated Sample)
- **Raw File:** `data/raw/phreshphish_sample.parquet` (1,000 rows $\times$ 8 columns, 87.25 MB).
- **Integrity Check:** 100% of sample rows possess non-empty raw HTML source code and non-null destination URLs.
- **Safety Protocol:** Inspected purely via static DOM parsing using `BeautifulSoup(html, "html.parser")`. No code execution, headless browser rendering, network callbacks, or script interpretation was permitted.
- **DOM Findings:**
  - 100% of pages contain `<form>` structures.
  - 82.4% feature password input fields (`<input type="password">`).
  - 41.2% submit credentials to cross-origin or external endpoints (e.g., Telegram bots, Discord webhooks, free PHP processing scripts).
  - Average embedded `<script>` tag count: 4.8 per page.
  - Average `<iframe>` count: 0.7 per page.
- **Verdict:** Pristine, leak-free multimodal HTML corpus for extracting DOM tree features, tag distributions, and lexical form action signals.

### 2.5 Zenodo Multimodal Dataset (Record 21379702 / V2.0)
- **Raw File:** `data/raw/Phishing dataset.zip` (1.47 GB compressed archive).
- **Metadata Tables:** Extracted in-memory from `merged_features_final.xlsx` (60,000 rows $\times$ 39 columns).
- **Screenshot Archive:** Contains exactly 7,062 `.png` website screenshots.
- **Image Mapping Integrity:** Filenames format `{excel_row_number}_{domain_or_path}.png`. Formula `df_index = excel_row_number - 2` achieves a 99.58% direct domain match.
- **Label Distribution (Paired Multimodal Subset):**
  - Total Paired Screenshots: 7,062
  - Legitimate (`is_phishing = 0`): 3,745 (53.03%)
  - Phishing (`is_phishing = 1`): 3,317 (46.97%)
- **Verdict:** High-fidelity, balanced multimodal dataset. Kept compressed on disk with lazy batch-based decompression to conserve SSD capacity and prevent filesystem bloat.

### 2.6 Live Threat Intelligence Feeds (PhishTank & OpenPhish)
- **PhishTank:** 43,223 verified phishing URLs. Target brand analysis revealed that 39,561 (91.53%) are tagged as `'Other'`, while 3,662 (8.47%) explicitly target named financial, social media, and SaaS brands.
- **OpenPhish:** 300 active zero-day phishing URLs. 127 (42.33%) abuse legitimate cloud hosting and app deployment platforms (Cloudflare Pages, Netlify, Vercel, Square, Weebly).
- **Quarantine Enforcement:** Both feeds are strictly isolated in `data/interim/` as 100% phishing corpora. They are never blended into balanced benchmark training sets.

---

## 3. Standardization and Data Cleaning Transformations

1. **Target Feature Standardization:** All dataset labels mapped to a binary integer column `is_phishing` ($1 = \text{phish}, 0 = \text{legitimate}$).
2. **Public Suffix Domain Extraction:** Using `tldextract`, every URL was parsed into its `subdomain`, `domain`, and `suffix` components to isolate `registered_domain` (e.g., `paypal.com.account-verification.xyz` $\rightarrow$ `account-verification.xyz`).
3. **Missing Value Treatment:** Zero missing values required imputation in PhiUSIIL, UCI, or PhreshPhish.
4. **Export Formats:** Cleaned subsets exported exclusively to Apache Parquet format (`snappy` compression) for high-performance vectorized I/O.
