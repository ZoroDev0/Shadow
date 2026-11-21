# SHADOW Research: Cross-Dataset Domain Overlap Analysis

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 2 — Dataset Cleaning, Quality Auditing & Preprocessing  
**Date:** November 2026  

---

## 1. Motivation and Overview

In machine learning for phishing detection, cross-dataset evaluation is frequently distorted by hidden domain overlaps. If training and test sets share identical second-level domains (e.g., `google.com`, `paypal-security.com`, `weebly.com`), classifiers can achieve deceptively high accuracy by simply memorizing high-frequency domain tokens or reputation scores, failing to generalize to completely novel zero-day attacks.

To quantify and control this phenomenon, we conducted a comprehensive registered-domain intersection study across all four URL-bearing corpora in SHADOW:
1. **PhiUSIIL Benchmark** (235,795 URLs)
2. **Zenodo Multimodal V2.0** (60,000 URLs)
3. **PhishTank Threat Feed** (43,223 verified phish)
4. **OpenPhish Active Feed** (300 zero-day phish)

---

## 2. Extraction Methodology: Public Suffix Awareness

Naive domain extraction based on string splitting (e.g., `url.split('/')[2].split('.')[-2]`) catastrophic failures on multi-part ccTLDs such as `.co.uk`, `.com.au`, or `.ac.in`. For example, `amazon.co.uk` would incorrectly extract `co` as the domain name.

In SHADOW, we resolve registered domains using the **Mozilla Public Suffix List** via `tldextract`:
```python
import tldextract

def extract_registered_domain(url: str) -> str:
    extracted = tldextract.extract(url)
    if extracted.domain and extracted.suffix:
        return f"{extracted.domain}.{extracted.suffix}".lower()
    return extracted.domain.lower() if extracted.domain else ""
```

---

## 3. Registered Domain Population Statistics

| Dataset | Total Records | Unique URLs | Unique Registered Domains | Average URLs per Domain |
| :--- | :--- | :--- | :--- | :--- |
| **PhiUSIIL** | 235,795 | 235,370 | 175,352 | 1.34 |
| **Zenodo V2.0 (Excel)** | 60,000 | 60,000 | 48,192 | 1.25 |
| **PhishTank** | 43,223 | 43,223 | 31,489 | 1.37 |
| **OpenPhish** | 300 | 300 | 268 | 1.12 |

---

## 4. Cross-Dataset Overlap Matrix

The following table summarizes the count of shared registered domains across each dataset pair:

| Dataset Pair | Overlapping Domains | Percentage of Source Domains | Percentage of Target Domains | Implications for Research |
| :--- | :--- | :--- | :--- | :--- |
| **PhiUSIIL $\cap$ Zenodo** | 12,841 | 7.32% (of PhiUSIIL) | 26.65% (of Zenodo) | High overlap among common legitimate domains (`wikipedia.org`, `youtube.com`). Multimodal models trained on Zenodo must not be tested on PhiUSIIL without domain-aware isolation. |
| **PhiUSIIL $\cap$ PhishTank** | 2,154 | 1.23% (of PhiUSIIL) | 6.84% (of PhishTank) | Moderate overlap. Shows recurrence of popular hosting platforms and shared legitimate targets. |
| **PhiUSIIL $\cap$ OpenPhish** | 47 | 0.03% (of PhiUSIIL) | 17.54% (of OpenPhish) | Primarily cloud hosting platforms (`workers.dev`, `pages.dev`, `firebaseapp.com`). |
| **Zenodo $\cap$ PhishTank** | 1,488 | 3.09% (of Zenodo) | 4.73% (of PhishTank) | Overlapping phishing attack infrastructure and target platforms. |
| **Zenodo $\cap$ OpenPhish** | 39 | 0.08% (of Zenodo) | 14.55% (of OpenPhish) | Cloud app builders and serverless edge hosting. |
| **PhishTank $\cap$ OpenPhish** | 58 | 0.18% (of PhishTank) | 21.64% (of OpenPhish) | Shared active attack campaigns observed simultaneously across both intelligence feeds. |

---

## 5. Most Frequent Overlapping Registered Domains

When inspecting the top 20 domains appearing simultaneously across multiple datasets, two primary clusters emerge:

1. **Global Legitimate Anchor Domains:**  
   `google.com`, `youtube.com`, `microsoft.com`, `apple.com`, `wikipedia.org`, `amazon.com`, `facebook.com`.  
   *Observation:* These domains appear in legitimate splits across static datasets and frequently serve as the target brand or redirector in phishing feeds.

2. **Shared Cloud Infrastructure & Shared Hostnames:**  
   `pages.dev` (Cloudflare Pages), `workers.dev` (Cloudflare Workers), `firebaseapp.com`, `weebly.com`, `blogspot.com`, `github.io`, `vercel.app`, `netlify.app`.  
   *Observation:* Modern phishing actors leverage free static site generators and edge serverless workers to bypass traditional IP and domain blocklists. Because these domains host both legitimate apps and zero-day phish, blacklisting the root registered domain is impossible. Models must rely on path depth, subdomains, HTML forms, and visual rendering rather than domain reputation alone.

---

## 6. Recommendations for Evaluation & Model Benchmarking

1. **Never Merge Threat Feeds into Static Benchmarks:** Keep PhishTank and OpenPhish completely separate as out-of-distribution evaluation suites.
2. **Quarantine Cloud Platforms During Evaluation:** When reporting zero-day detection performance on OpenPhish, separate generic registered domains from shared platform services (`pages.dev`, `netlify.app`) to evaluate subdomain and path sensitivity.
3. **Domain Grouping is Mandatory:** Never use randomized splitting on PhiUSIIL or Zenodo. Domain grouping guarantees that no registered domain appears in both the training and test partitions.
