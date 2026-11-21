# SHADOW Research: Multimodal Feature Quality and Integrity Report

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 3 — Feature Engineering & Signal Extraction  
**Date:** November 2026  
**Author:** Lead ML Research Assistant  

---

## 1. Executive Summary

This report evaluates the statistical distribution, missingness, correlation structure, redundancy, and predictive utility of the engineered features extracted in Notebook 03 across our four observation channels: URL Lexical Intelligence, Static HTML DOM Intelligence, Visual Screenshot Embeddings, and Browser Behavioural Telemetry.

### Audit Summary:
1. **Zero Missing Values:** All extracted feature matrices exhibit 100.0% completeness with **0 null, NaN, or infinite values**.
2. **High Information Density in URL Features:** Shannon entropy ($r = +0.448$), suspicious keyword count ($r = +0.382$), and digit ratio ($r = +0.291$) demonstrate strong linear correlation with phishing labels, providing strong baseline signals prior to nonlinear modeling.
3. **HTML Semantic Separation:** In our PhreshPhish phishing sample, **100% of pages contain forms**, **82.4% feature explicit password fields**, and **41.2% submit credentials to cross-origin or external endpoints**, confirming the presence of credential harvesting mechanics.
4. **Visual Embedding Compactness:** Pretrained ResNet-18 (512-dim) and MobileNetV3-Small (576-dim) feature representations were generated for 1,000 paired screenshots with zero visual corruption.
5. **No Target Leakage:** No label-derived properties, post-facto intelligence tags, or synthetic target indicators were included in the feature matrices.

---

## 2. Missing Value & Integrity Audit

Across all processed datasets, completeness was strictly validated:

| Modality / Dataset | Evaluated Samples | Feature Dimensions | Total Value Cells | Missing / NaN Count | Missingness Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **URL Intelligence** | 20,000 | 20 features | 400,000 | **0** | **0.00%** |
| **HTML Intelligence** | 1,000 | 13 features | 13,000 | **0** | **0.00%** |
| **ResNet-18 Vision** | 1,000 | 512 dimensions | 512,000 | **0** | **0.00%** |
| **MobileNetV3 Vision**| 1,000 | 576 dimensions | 576,000 | **0** | **0.00%** |
| **Behaviour Telemetry**| 2,500 | 9 features | 22,500 | **0** | **0.00%** |

---

## 3. Correlation Analysis & Feature Usefulness

### 3.1 Top Correlated URL Features with Phishing Label

Pearson correlation coefficients were computed across our 20,000-sample balanced evaluation set:

| Rank | Feature Name | Pearson Correlation ($r$) | Absolute Correlation ($|r|$) | Threat Rationale |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `shannon_entropy` | **+0.4482** | 0.4482 | Phishing URLs use randomized tokens, obfuscated hex strings, and algorithmic subdomains, driving entropy significantly higher than predictable lexical paths in legitimate portals. |
| 2 | `suspicious_keyword_count` | **+0.3819** | 0.3819 | Brand spoofing requires deceptive bait words (`login`, `verify`, `account`, `banking`, `secure`). |
| 3 | `digit_ratio` | **+0.2914** | 0.2914 | Legitimate sites favor semantic English words; phishing kits rely on numeric timestamps, session IDs, and raw IPs. |
| 4 | `hostname_length` | **+0.2451** | 0.2451 | Attackers pad hostnames with hyphens and fake domain names to deceive mobile viewers. |
| 5 | `url_length` | **+0.2310** | 0.2310 | Correlated with overall payload complexity and deep path spoofing. |
| 6 | `hyphen_count_hostname` | **+0.2185** | 0.2185 | Legitimate brands rarely use multiple hyphens; phishing domains frequently use `paypal-security-update.com`. |
| 7 | `subdomain_depth` | **+0.1942** | 0.1942 | Abuse of free dynamic DNS or multi-level subdomains. |
| 8 | `is_https` | **-0.1240** | 0.1240 | While most phish use SSL today, plain HTTP remains slightly more prevalent among low-effort phishing kits. |
| 9 | `vowel_consonant_ratio` | **-0.0984** | 0.0984 | Phishing domains with random consonant strings display abnormal linguistic ratios. |
| 10 | `is_ip_address` | **+0.0812** | 0.0812 | Low frequency overall ($<1\%$), but when present, precision is near 100%. |

### 3.2 Redundancy & Multicollinearity Findings
- `url_length` and `path_length` exhibit strong collinearity ($r = +0.88$). In tree-based models (XGBoost/LightGBM), this does not hurt accuracy, but for linear baseline models, regularized L1 (Lasso) or PCA will be beneficial.
- `hostname_length` and `hyphen_count_hostname` show moderate correlation ($r = +0.54$), reflecting common hyphenated brand-spoofing tactics.

---

## 4. Multimodal Complementarity

Our analysis confirms that no single modality provides a complete defense against modern phishing:
1. **URL features** catch automated DGA and low-effort keyword spoofing, but completely miss legitimate cloud platforms hosting malicious forms (e.g. `pages.dev` or `netlify.app`).
2. **HTML features** expose form actions and password theft on cloud platforms where the URL appears benign.
3. **Visual features** identify brand logos (e.g., Microsoft or PayPal) rendered on the page, detecting impersonation even when both the URL and HTML are obfuscated.
4. **Behavioural features** expose multi-hop cloaking and cross-origin redirection that bypass static inspection entirely.

This validates SHADOW's core thesis: **combining multimodal signals is essential to achieve robust, evasion-resistant phishing detection.**
