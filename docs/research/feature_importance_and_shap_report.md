# SHADOW Research: Feature Importance and SHAP Explainability Report

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 4 — Model Interpretability & Explainability  
**Date:** November 2026  
**Artifact Path:** `artifacts/figures/notebook04_feature_importance.png`  

---

## 1. Interpretability Overview & Objective

In mission-critical cybersecurity deployments, black-box predictions are unacceptable. Security analysts and end users need to know *why* a website was classified as phishing. 

We conducted two complementary explainability analyses on our trained unified LightGBM classifier:
1. **Global Gini / Information Gain Importance:** Quantifies the total reduction in training loss contributed by each feature across all tree splits.
2. **SHAP (SHapley Additive exPlanations) Game-Theoretic Analysis:** Deconstructs individual sample predictions into additive feature contributions based on Shapley values.

---

## 2. Top 15 Most Influential Features (Information Gain)

| Rank | Feature Identifier | Subspace | Total Gain | Directional Interpretation |
| :--- | :--- | :--- | :--- | :--- |
| **1** | `is_https` | URL Lexical | **87,579.8** | Low-effort HTTP phishing kits lack valid SSL certificates. |
| **2** | `path_length` | URL Lexical | **72,417.6** | Attackers nest extensive deceptive paths to hide phishing kits within deep compromised folders. |
| **3** | `html_size_bytes` | HTML Semantic | **12,389.0** | Phishing clone landing pages are significantly more lightweight than full legitimate portals. |
| **4** | `digit_ratio` | URL Lexical | **11,982.7** | High concentration of numeric timestamps, session IDs, and raw IPs in phishing links. |
| **5** | `url_length` | URL Lexical | **4,689.9** | Overall character count correlated with payload complexity. |
| **6** | `has_html_modality` | Meta-Indicator | **3,840.3** | Distinguishes whether the model should evaluate DOM-based decision branches. |
| **7** | `subdomain_depth` | URL Lexical | **2,795.4** | Multi-level subdomains abusing dynamic DNS or cloud platforms (`login.verify.paypal.com.xyz`). |
| **8** | `num_subdirectories` | URL Lexical | **1,854.9** | Count of directory segments (`/`) indicating nested kit folders. |
| **9** | `hostname_length` | URL Lexical | **1,675.5** | Long hostnames designed to push suspicious TLDs past the visible mobile address bar. |
| **10** | `num_external_hyperlinks`| HTML Semantic | **1,557.3** | Ratio of external anchor links pointing to authentic corporate portals to mimic legitimacy. |
| **11** | `shannon_entropy` | URL Statistical | **1,499.6** | High character randomness indicative of DGA (domain generation algorithms) or obfuscation. |
| **12** | `special_char_ratio` | URL Lexical | **1,306.0** | Density of `-`, `_`, `=`, `%`, `?` tokens. |
| **13** | `query_length` | URL Lexical | **1,170.9** | Long query parameter strings carrying encoded victim emails or tracking IDs. |
| **14** | `vowel_consonant_ratio` | URL Linguistic | **1,146.7** | Unnatural consonant clusters in algorithmically generated domains. |
| **15** | `tld_length` | URL Lexical | **962.0** | Abnormal TLD lengths associated with free or low-reputation top-level domains. |

---

## 3. SHAP Summary Findings

Using `shap.TreeExplainer(model)` on held-out test samples:
- **`path_length` and `digit_ratio`:** High feature values strongly push the log-odds toward the **Phishing** classification.
- **`is_https`:** Absence of HTTPS (value = 0) exerts a strong positive push toward **Phishing**, whereas presence of HTTPS (value = 1) serves as a moderating factor requiring secondary signals.
- **`html_size_bytes`:** Abnormally small HTML pages (< 15 KB) with active forms push predictions sharply toward **Phishing**.
- **Visual Features (`vis_dim_*`):** When present, deep visual representations act as high-confidence confirmation signals, providing the necessary margin to classify visual brand clones that use clean URLs.

---

## 4. Verification Against Target Leakage

- **Absence of Labels:** Neither `is_phishing` nor any intermediate threat intelligence tags appear anywhere in the tree splits.
- **Absence of Domain Names:** `registered_domain` was omitted from feature selection; the model cannot make predictions based on memorized domain strings.
- **Conclusion:** The model has learned generalizable, defensible cybersecurity heuristics based on structural, lexical, and visual features.
