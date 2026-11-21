# SHADOW Research: Data Leakage Prevention and Splitting Strategy

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 2 — Dataset Cleaning, Quality Auditing & Preprocessing  
**Date:** November 2026  

---

## 1. The Core Problem: Domain Leakage in Cybersecurity ML

In standard machine learning competitions and general tabular benchmarks, standard random partitioning (e.g., `train_test_split(test_size=0.2, random_state=42)`) is the default practice. In cybersecurity—specifically URL and phishing detection—**random splitting is fatally flawed** and introduces severe data leakage.

### How Domain Leakage Happens
1. **Multi-URL Domains:** Many legitimate websites and phishing campaigns generate dozens or hundreds of distinct URLs under a single registered domain.
   - Example (Legitimate): `wikipedia.org/wiki/Phishing`, `wikipedia.org/wiki/Computer_security`, `wikipedia.org/wiki/URL`.
   - Example (Phishing Campaign): `secure-login-appleid.com/login.php`, `secure-login-appleid.com/verify.html`, `secure-login-appleid.com/update-payment.php`.
2. **Memorization vs. Generalization:** If 80% of URLs from `secure-login-appleid.com` are placed into the training set and 20% into the test set, any tree-based model (Random Forest, XGBoost) or neural network will simply memorize the character tokens, domain length, or registrar features of that specific domain.
3. **Catastrophic Real-World Performance:** In production, attackers register new domains daily (zero-days). A model evaluated with random splitting may report a 99.8% F1-score in the laboratory, but its real-world detection rate on unseen domains drops to 60-70%.

---

## 2. Quantitative Evidence of Leakage Risk in PhiUSIIL

During our audit of the 235,795 URLs in PhiUSIIL, we computed the frequency distribution of URLs per registered domain:
- **Total Unique Registered Domains:** 175,352.
- **Domains with Exactly 1 URL:** 157,003 (89.53% of domains).
- **Domains with >1 URL (Multi-URL Clusters):** 18,349 (10.47% of domains).
- **Total URLs Belonging to Multi-URL Clusters:** 78,792 URLs (**33.42% of the entire dataset**).

Under a naive random 70/30 split, approximately **23,600 URLs in the test set** would share a domain with records in the training set. This represents a massive 30%+ leakage surface that completely invalidates test generalization metrics.

---

## 3. The SHADOW Solution: Zero-Leakage Domain-Grouped Splitting

To eliminate domain leakage, SHADOW enforces a strict **Domain-Grouped Partitioning Protocol** utilizing `GroupShuffleSplit` (and `GroupKFold` for cross-validation):

```python
from sklearn.model_selection import GroupShuffleSplit

# Split 1: 70% Train, 30% Temporary (Validation + Test) grouped by registered_domain
gss_outer = GroupShuffleSplit(n_splits=1, test_size=0.30, random_state=42)
train_idx, temp_idx = next(gss_outer.split(df, groups=df['registered_domain']))

df_train = df.iloc[train_idx].copy()
df_temp = df.iloc[temp_idx].copy()

# Split 2: Divide Temporary 50/50 into Validation and Test (15% / 15% overall)
gss_inner = GroupShuffleSplit(n_splits=1, test_size=0.50, random_state=42)
val_sub_idx, test_sub_idx = next(gss_inner.split(df_temp, groups=df_temp['registered_domain']))

df_val = df_temp.iloc[val_sub_idx].copy()
df_test = df_temp.iloc[test_sub_idx].copy()
```

### Mathematical Verification of Partitioning

We executed this exact split across the complete 235,795 records of PhiUSIIL and verified the domain sets:

$$\text{Domains}(\text{Train}) \cap \text{Domains}(\text{Val}) = \emptyset$$
$$\text{Domains}(\text{Train}) \cap \text{Domains}(\text{Test}) = \emptyset$$
$$\text{Domains}(\text{Val}) \cap \text{Domains}(\text{Test}) = \emptyset$$

### Empirical Partitioning Results

| Partition | Record Count | Percentage of URLs | Unique Registered Domains | Class Distribution (% Phish) | Domain Overlap with Other Sets |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Train** | 165,116 | 70.02% | 122,746 | 42.86% | **0 (0.00%)** |
| **Validation** | 35,463 | 15.04% | 26,303 | 42.66% | **0 (0.00%)** |
| **Test** | 35,216 | 14.94% | 26,303 | 42.72% | **0 (0.00%)** |
| **Total** | **235,795** | **100.00%** | **175,352** | **42.81%** | **Guaranteed Disjoint** |

*Key Observation:* Because domain sizes vary slightly, the record counts deviate by mere fractions of a percent from the exact 70/15/15 target, while preserving an identical, realistic class balance (~42.7% phishing) across all three partitions.

---

## 4. Chronological and Out-of-Distribution Splitting

In addition to static domain grouping on historical benchmarks, real-world deployment requires chronological evaluation:
1. **Temporal Validation:** For datasets containing timestamps (such as PhishTank submission times), evaluation should train on older attacks and test on future attacks ($T_{\text{train}} < T_{\text{test}}$) to simulate threat evolution.
2. **Zero-Day Out-of-Distribution Benchmarking:** Live feeds like OpenPhish (which reflect zero-day cloud abuse from late 2026) serve as an independent held-out evaluation corpus that has zero temporal or source overlap with historical training benchmarks.

---

## 5. Artifact Preservation

The verified splits for PhiUSIIL are permanently stored in:
- `data/processed/phiusiil_domain_splits.parquet` (25.96 MB)
- Features include: `URLLength`, `DomainLength`, `IsDomainIP`, `TLDLegitimateProb`, `NoOfSubDomain`, `LetterRatioInURL`, and the new categorical split tag `split` (`train`, `val`, `test`).
