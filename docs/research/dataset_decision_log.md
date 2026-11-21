# SHADOW Research: Dataset Decision Log

**Project:** SHADOW  
**Stage:** Dataset Discovery & Evaluation  
**Date:** November 2026  
**Document Owner:** SHADOW Machine Learning Research Working Group  

---

## 1. Decision Framework

Every discovered dataset was evaluated against four core criteria:
1. **Research Utility:** Does this dataset advance multimodal phishing detection (URL lexical, HTML DOM structure, visual rendering, or live intelligence)?
2. **Data Integrity & Label Quality:** How were labels assigned? Are ground truths verified or crowdsourced? Is there severe label noise?
3. **Hardware & Storage Compatibility:** Can the dataset be processed on our development workstation (24 GB RAM, 6 GB VRAM RTX 4050, 256 GB SSD) while preserving at least 35 GB of free SSD storage?
4. **Licence & Compliance:** Does the dataset possess an unencumbered academic or open-source licence (e.g. CC BY 4.0)?

---

## 2. Decision Log Entries

### Entry 01: PhiUSIIL Phishing URL Dataset (UCI ID 967)
- **Status:** **APPROVED — Primary Training Candidate**
- **Primary Modality:** Tabular URL Lexical & Webpage Content Features
- **Total Samples:** 235,795 (134,850 Legitimate, 100,945 Phishing)
- **Licence:** CC BY 4.0
- **Decision Rationale:** 
  We inspected the dataset schema and found 46 distinct features capturing URL syntax (e.g., `CharContinuationRate`, `URLCharProb`) and page-level signals (`URLTitleMatchScore`, `TLDLegitimateProb`). The class balance is realistic (~43% phishing), and the total size (~15 MB compressed, ~66 MB raw CSV) easily fits into memory without stressing our 24 GB RAM. This serves as our foundational training corpus for lexical baseline models (XGBoost, Random Forest, Multi-Layer Perceptrons).

---

### Entry 02: Phishing and Legitimate Websites Dataset V2.0 (Zenodo: 21379702)
- **Status:** **APPROVED — Multimodal Research Candidate**
- **Primary Modality:** Multimodal (URL strings, 18 tabular features in XLSX, 7,062 Webpage Screenshots)
- **Total Samples:** 60,000 URLs, 7,062 PNG Screenshots
- **Licence:** CC BY 4.0
- **Decision Rationale:**
  A key priority of SHADOW is visual phishing detection (detecting credential harvesting forms that visually mimic trusted brands like Microsoft, Google, PayPal, or Chase). Zenodo V2.0 provides actual browser-rendered PNG screenshots alongside URL indices. At 1.69 GB compressed (~2.2 GB uncompressed), it fits comfortably within our 256 GB drive while leaving over 245 GB free, satisfying our $\ge 35\text{ GB}$ reserve. This dataset is our anchor for multimodal vision-language fusion experiments (e.g., Vision Transformer + URL CNN).

---

### Entry 03: PhreshPhish (Hugging Face / arXiv:2507.10854)
- **Status:** **APPROVED — Multimodal Research Candidate (Bounded Sampling Only)**
- **Primary Modality:** HTML-URL Pairs (Full raw DOM trees)
- **Total Samples:** 666,000+ samples (36.6 GB full repository)
- **Licence:** CC BY 4.0 (Anti-phishing research only)
- **Decision Rationale:**
  While raw HTML structure is vital for analyzing suspicious form destinations (`<form action="...">`), hidden input fields, and obfuscated JavaScript, the uncompressed 36.6 GB repository would consume over 15% of our entire SSD. In accordance with Section 8 & 9 of our research guidelines, we rejected an unconstrained download. Instead, we approve bounded streaming of sample test partitions (~50 to 100 MB) to inspect real-world HTML DOM structures without risking disk exhaustion.

---

### Entry 04: LegitPhish (Mendeley Data DOI 10.17632/hx4m73v2sf.2)
- **Status:** **APPROVED — Independent Evaluation Candidate**
- **Primary Modality:** Annotated URL Lexical Features & Raw URLs
- **Total Samples:** 101,219 (63,678 Phishing, 37,540 Legitimate)
- **Licence:** CC BY 4.0
- **Decision Rationale:**
  In machine learning, testing solely on a random train/test split from a single corpus leads to optimistic performance estimates due to shared domain distributions and crawler bias. LegitPhish was curated independently in 2024-2025 by Potpelwar et al., sourcing legitimate URLs from Wikipedia and Stack Overflow. Using LegitPhish exclusively as an out-of-distribution holdout evaluation set allows us to test whether SHADOW generalizes to unfamiliar URL patterns.

---

### Entry 05: UCI Phishing Websites (ID 327) & UCI Website Phishing (ID 379)
- **Status:** **APPROVED — Historical Benchmarks**
- **Primary Modality:** Discrete tabular heuristic features {-1, 0, 1}
- **Total Samples:** 11,055 (ID 327) and 1,353 (ID 379)
- **Licence:** CC BY 4.0
- **Decision Rationale:**
  These classical datasets (dating from 2012-2015) rely on manually crafted heuristic rules. While their features are too dated for primary deployment in modern 2026 phishing environments, they provide valuable benchmark sanity checks for verifying classical algorithm baselines and ensuring our pipeline can reproduce historical results. They require under 2 MB of total disk space.

---

### Entry 06: OpenPhish Community Feed
- **Status:** **APPROVED — Threat Intelligence Source**
- **Primary Modality:** Active Live Phishing URLs (Plain Text)
- **Total Samples:** Rolling feed of ~1,500 - 5,000 active URLs
- **Licence:** OpenPhish Community Terms (Free for non-commercial research)
- **Decision Rationale:**
  Static datasets go stale quickly as phishing infrastructure evolves. OpenPhish captures active zero-day campaigns currently targeting internet users. By downloading snapshots of this feed, we create an ultra-modern evaluation testbed to measure how effectively SHADOW identifies brand-new malicious URLs without relying on pre-existing blacklists.

---

### Entry 07: PhishTank Online Validated Database
- **Status:** **APPROVED — Threat Intelligence Source**
- **Primary Modality:** Verified Phishing URLs, Submission Timestamps, Target Brands
- **Total Samples:** ~25,000 - 50,000 active verified URLs (~8 MB CSV)
- **Licence:** PhishTank Developer Terms (Free for research with User-Agent)
- **Decision Rationale:**
  PhishTank provides verified ground truth with exact submission timestamps and target identification. This enables our team to evaluate temporal degradation (how detection accuracy degrades as campaigns age) and analyze brand distribution patterns.

---

### Entry 08: URLhaus (abuse.ch API v2)
- **Status:** **CONDITIONAL — Threat Intelligence Source**
- **Primary Modality:** Malware distribution and phishing payloads
- **Decision Rationale:**
  abuse.ch deprecated public keyless bulk downloads, returning HTTP 410 Gone for legacy links. Automated bulk export now requires an `Auth-Key` from `auth.abuse.ch`. Because the dataset is free and high quality, we classify it as conditional: it is fully documented and ready to ingest as soon as a student developer provides a free API key in `.env`.

---

### Entry 09: Web2VecPhishingDataset (Mendeley Data DOI 10.17632/8ws5vb8w2n.1)
- **Status:** **VALIDATION CANDIDATE (Secondary)**
- **Primary Modality:** Multi-space feature vectors (URL, DNS, GEO, HTML, SSL, WHOIS)
- **Total Samples:** 6.39M harmonized records; FullSpace contains 496,850 rows x 236 columns
- **Decision Rationale:**
  Web2Vec provides expansive pre-computed multi-space features. However, its 236-column schema without raw text representations would require significant feature alignment. We preserve it as a secondary reference for DNS/WHOIS feature schema design rather than our primary URL training set.

---

### Entry 10: Phishpedia (USENIX Security '21)
- **Status:** **VALIDATION CANDIDATE (Visual Specialization)**
- **Primary Modality:** Webpage Screenshots & Brand Logo Annotations
- **Total Samples:** ~30,000 phishing samples
- **Decision Rationale:**
  Phishpedia is a benchmark for visual logo extraction and Siamese network matching. However, the files are hosted on Google Drive, which imposes automated quota locks and lacks paired legitimate websites. We use its methodology to guide our logo recognition design, while relying on Zenodo V2.0 for balanced visual training data.

---

## 3. Summary of Roles

```
               [SHADOW MULTIMODAL DETECTION ENGINE]
                                |
      +-------------------------+-------------------------+
      |                         |                         |
[Tabular / Lexical]     [Visual / Multimodal]     [Threat Intel]
      |                         |                         |
  PhiUSIIL (Train)       Zenodo V2.0 (Train/Val)   OpenPhish (Zero-Day)
  LegitPhish (Holdout)   PhreshPhish (HTML Sample) PhishTank (Ground Truth)
  UCI 327/379 (Baseline) Phishpedia (Logo Ref)     URLhaus (Malware/Auth)
```
