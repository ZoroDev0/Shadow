# SHADOW Research: Unified Classifier Architecture Documentation

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 4 — Model Architecture Specification  
**Date:** November 2026  
**Artifact Path:** `models/shadow_unified_classifier.txt` | Schema: `models/feature_schema.json`  

---

## 1. System Architecture Overview

Project SHADOW enforces a strict **Single-Classifier Philosophy**: rather than deploying fragmented, disconnected micro-models for URL strings, HTML structures, and images, SHADOW trains **one final unified LightGBM classifier**.

```
[ Incoming Web Target ]
           │
           ├──► URL String ────────► [ 20 Lexical Features ] ──────────┐
           │                                                          │
           ├──► Raw HTML DOM ──────► [ 13 Static DOM Features ] ──────┼──► [ 67-Dim Unified Vector ]
           │                         (or NaN if absent)               │              │
           ├──► Rendered Screenshot ► [ MobileNetV3 Frozen CNN ] ─────┤              │
           │                         (Top 32 Embeddings / NaN)        │              ▼
           └──► Modality Flags ────► [ has_html, has_visual ] ────────┘     [ Single Unified ]
                                                                           [ LightGBM Model ]
                                                                                     │
                                                                                     ▼
                                                                        [ Phishing Probability p ]
                                                                        [ Threshold tau = 0.27   ]
                                                                                     │
                                                                                     ▼
                                                                          [ Legit (0) / Phish (1) ]
```

---

## 2. Feature Representation & Input Space (67 Features)

The model ingests a 67-dimensional feature vector $\mathbf{x} \in \mathbb{R}^{67}$:

### Modality Indicators (2 Features)
- `has_html_modality`: $\{0, 1\}$
- `has_visual_modality`: $\{0, 1\}$

### URL Intelligence Subspace (20 Features)
- `url_length`, `hostname_length`, `path_length`, `query_length`
- `shannon_entropy`, `digit_ratio`, `special_char_ratio`, `subdomain_depth`
- `is_ip_address`, `suspicious_keyword_count`, `has_url_encoding`, `has_at_symbol`
- `has_double_slash_redirect`, `num_subdirectories`, `num_query_params`
- `is_https`, `has_punycode`, `tld_length`, `hyphen_count_hostname`, `vowel_consonant_ratio`

### HTML Intelligence Subspace (13 Features)
- `html_size_bytes`, `num_forms`, `num_password_inputs`, `num_hidden_inputs`, `num_text_inputs`
- `num_iframes`, `num_external_scripts`, `has_meta_refresh`, `has_cross_origin_form`
- `has_empty_or_hash_form_action`, `form_action_is_ip`, `num_external_hyperlinks`, `has_popup_window`

### Visual Intelligence Subspace (32 Features)
- `vis_dim_0` through `vis_dim_31`: Top 32 highest-variance deep feature representations extracted by a **frozen pretrained MobileNetV3-Small** convolutional backbone.

---

## 3. LightGBM Hyperparameter Configuration

The model was trained using Gradient Boosted Decision Trees (GBDT) with the following tuned parameters:

| Hyperparameter | Value | Rationale & Cyber Threat Purpose |
| :--- | :--- | :--- |
| **Objective** | `binary` | Binary log-loss optimization for probability estimation. |
| **Boosting Type** | `gbdt` | Standard gradient boosting with histogram-based split finding. |
| **Learning Rate** | `0.05` | Conservative shrinkage preventing overfitting to dominant hosting providers. |
| **Number of Estimators** | `500` (Best: 164) | Sufficient capacity with early stopping monitoring validation loss. |
| **Early Stopping Rounds**| `30` | Prevents overtraining on noisy URL parameters. |
| **Maximum Depth** | `6` | Constrains tree depth to prevent deep memorization of specific campaign tokens. |
| **Number of Leaves** | `31` | Balanced capacity for learning multi-feature interaction rules. |
| **Subsample (Bagging)** | `0.80` | Random row subsampling per iteration for variance reduction. |
| **Colsample By Tree** | `0.80` | Feature bagging ensuring tree diversity across modalities. |
| **Missing Values** | `NaN` (Native) | LightGBM routes missing HTML/visual entries down optimal split paths. |

---

## 4. Inference Pipeline & Client Form Factors

Because the classifier is compiled as a lightweight LightGBM booster (`shadow_unified_classifier.txt`, **560 KB**):
1. **Chrome Extension:** Ingests URL features instantly in $<0.03\text{ ms}$; if the DOM loads, appends HTML features for a secondary inference pass in $<0.05\text{ ms}$.
2. **Android App:** Compact footprint easily ported to Treelite or WebAssembly.
3. **Backend Service:** Sustains $>290,000\text{ inferences/sec}$ on a single CPU thread.
