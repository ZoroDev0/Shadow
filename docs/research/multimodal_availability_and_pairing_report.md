# SHADOW Research: Multimodal Availability & Pairing Analysis

**Project:** SHADOW (Student-Built Cybersecurity Detection Engine)  
**Research Focus:** Multimodal Fusion (URL Lexical + Webpage HTML + Screenshot Vision)  
**Date:** November 2026  
**Document Authors:** SHADOW Multimodal Architecture Working Group  

---

## 1. The Core Research Hypothesis

Modern phishing attacks have evolved far beyond trivial misspelled domain names. Attackers deploy legitimate cloud providers (Cloudflare, AWS, Firebase), punycode homoglyphs, and dynamic single-page applications that evade simple blacklist lookups.

The SHADOW research pipeline investigates a fundamental question:
> **Can combining multiple independent signals (URL lexical syntax, webpage HTML DOM structure, and visual screenshot rendering) achieve significantly higher detection accuracy and lower false positives than any single modality alone?**

To answer this, our dataset discovery specifically targeted sources that provide or enable pairing across our three core modalities:
1. **URL Data:** String structure, hostname, path, token entropy, and lexical anomalies.
2. **HTML Data:** Form count, input field types, external script origins, and iframe embedding.
3. **Screenshot Data:** Visual layout, login box positioning, and brand logo impersonation.

---

## 2. Modality Breakdown & Inspection Protocol

```
                        +----------------------------+
                        |  INCOMING WEBSITE TARGET   |
                        +--------------+-------------+
                                       |
          +----------------------------+----------------------------+
          |                            |                            |
          v                            v                            v
  [1. URL MODALITY]            [2. HTML MODALITY]          [3. VISION MODALITY]
  - Raw URL String             - DOM Tree Hierarchy         - 2D Rendered Image
  - TLD & Subdomain Depth      - <form> Action URLs         - Brand Logo Detector
  - Shannon Entropy            - External <script> Count    - Visual Layout Sim
  - Lexical Tokenization       - Hidden <input> Fields      - OCR on Text Elements
```

### 2.1 Modality 1: URL Characteristics
- **Key Signals:** 
  - Token continuation rates, digit-to-letter ratios, and Shannon entropy.
  - Presence of IP addresses, `@` symbols, excessive subdomains, or misleading brand tokens in the path (e.g. `legit-domain.com/paypal/login`).
  - Top-Level Domain (TLD) risk score and domain registration characteristics.
- **Safety Standard:** Purely static string tokenization via Python's `urllib.parse` and `tldextract`. URLs are never resolved or requested over live sockets.

### 2.2 Modality 2: Webpage HTML Structure
- **Key Signals:**
  - `<form>` submission destinations: Does the form `action` point to an external, unverified domain or a third-party webhook (e.g., Formspree, Discord webhook)?
  - Ratio of internal vs. external hyperlinks (`<a>` tags pointing outside the host domain).
  - Suspicious hidden input elements (`<input type="hidden">`) designed to capture and relay session tokens.
  - Iframe usage (`<iframe>`) that embeds legitimate authentication portals inside an attacker-controlled outer frame.
- **Safety Standard:** Static parsing only using Python's `BeautifulSoup4` with the `lxml` parser or regex. **Never execute `<script>` tags, never run headless browsers on untrusted files, and never render active content.**

### 2.3 Modality 3: Visual Screenshot Data
- **Key Signals:**
  - High visual similarity to high-value target brands (Microsoft 365, Google Workspace, PayPal, Bank of America) combined with an unauthorized domain name.
  - Visual layout cues: centered credential harvesting dialogs, password entry inputs, and warning badges.
- **Safety Standard:** Loaded strictly as 2D pixel arrays via Pillow (`PIL.Image`) or OpenCV. Static decoding only; no browser rendering engines are attached to downloaded assets.

---

## 3. Dataset Multimodal Coverage & Pairing Matrix

| Dataset | URL Modality Available? | HTML Modality Available? | Screenshot Modality Available? | Paired Samples Count | URL-to-Asset Mapping Method | Notes on Coverage & Missingness |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **`zenodo_multimodal_21379702`** | **Yes** (60k URLs) | **Partial** (18 parsed features in XLSX) | **Yes** (7,062 PNGs) | **7,062** paired URL + Screenshot pairs | Class directory structure (`train/`, `test/`) + index mapping | **11.77%** screenshot availability (7,062 PNGs for 60,000 URLs in `merged_features_final.xlsx`). |
| **`phreshphish_hf`** | **Yes** (1,000 sample) | **Yes** (Full raw DOM) | **No** (No screenshots) | **1,000** paired URL + HTML pairs | 1-to-1 row pairing in Parquet tables | 100% pairing between URLs and raw HTML documents in verified sample shard (`test-000.parquet`). |
| **`uci_phiusiil`** | **Yes** (235k URLs) | **Extracted** (DOM features) | **No** | **235,795** URL + Feature pairs | 1-to-1 row pairing in CSV | Raw HTML is omitted; features like `URLTitleMatchScore` are pre-computed. |
| **`mendeley_legitphish`** | **Yes** (101k URLs) | **No** | **No** | **101,219** URL records | Direct CSV rows | Lexical URL features only. |
| **`openphish_community`** | **Yes** (Live feed) | **No** | **No** | Live URL strings only | Line-by-line list | Zero-day phishing strings; sites are live in the wild. |
| **`phishtank_online_valid`** | **Yes** (~30k URLs) | **No** | **No** | Verified URL records | CSV rows with submission metadata | Includes target brand annotations (`phish_detail_url`, `target`). |
| **`phishpedia_usenix`** | **Yes** (30k URLs) | **Yes** (Raw DOM) | **Yes** (PNG images) | **~30,000** paired samples | Folder per sample (`sample_id/`) | Phishing-only; lacks legitimate counter-examples. |

---

## 4. Critical Findings on Missing Modalities & Data Leakage

### 4.1 Why Missing Screenshots Do Not Imply Legitimacy
In the Zenodo V2.0 archive (`Phishing dataset.zip`), exactly 7,062 of the 60,000 URLs have corresponding rendered PNG screenshots (an 11.77% pairing rate). Our research team investigated why the remaining 52,938 URLs lack screenshots:
1. **Short Phishing Lifespan:** Phishing websites have an average active lifespan of under 24 hours. When the automated Selenium crawler visited the URL, the hosting provider or registrar had already suspended the server.
2. **Anti-Bot Cloaking:** Sophisticated phishing kits inspect the incoming IP and User-Agent. If an automated crawler or headless Chrome instance is detected, the server returns HTTP 403, 404, or redirects to `google.com`.
3. **Cloudflare / CDN Captcha Gates:** Legitimate websites often block automated crawlers with Cloudflare Turnstile or Akamai challenges, yielding an empty screenshot.

> **Research Rule:** *A missing screenshot must NEVER be treated as a negative (legitimate) signal. Our multimodal fusion architecture must support graceful degradation—if a screenshot is unavailable or fails to load, the model must rely on the URL and HTML classifiers with an explicit missingness indicator.*

### 4.2 Preventing Data & Domain Leakage
A critical flaw in many published phishing detection papers is **random sample splitting**. 

If a phishing campaign creates 200 URLs under `subdomain1.attacker.xyz/login`, `subdomain2.attacker.xyz/login`, etc., a random train/test split will place 160 in the training set and 40 in the test set. The model simply memorizes the domain `attacker.xyz` rather than learning generalized phishing signals, resulting in an artificially inflated 99.9% accuracy that collapses in production.

**Our Mitigation Strategy:**
- We implement **Group-KFold splitting based on registered domain (SLD + TLD)** using `tldextract`.
- All URLs sharing the same base domain are placed strictly within the same fold (either train OR test, never split across both).
- We validate models against completely independent external sources (**LegitPhish** and **OpenPhish**) whose domains were never seen during training.

---

## 5. Architectural Recommendations for SHADOW

1. **Dual-Path Early Fusion:**
   - **Path A (Lightweight / Real-Time):** URL Lexical & Heuristic Classifier (XGBoost/LightGBM trained on PhiUSIIL) runs inside the Chrome Extension in $<5\text{ ms}$.
   - **Path B (Deep Multimodal):** For URLs flagged as suspicious or low-confidence, the backend downloads static DOM and screenshot assets to run Vision Transformer (ViT) and HTML graph analysis.
2. **Explicit Missing-Modality Masking:**
   - The multimodal fusion head will accept a binary mask indicating which modalities were successfully captured `[has_url=1, has_html=0, has_image=1]`, ensuring robust inference across diverse network conditions.
