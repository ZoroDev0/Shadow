# India URL held-out evaluation

- **Set:** 60 written URLs
- **Lookalike/phishing URLs:** 30
- **Official domains:** 30
- **Evaluation method:** Rules-only `analyze_link()` verdict
- **Precision:** 1.00
- **Recall:** 1.00
- **True positives:** 30
- **True negatives:** 30
- **False positives:** 0
- **False negatives:** 0
- **ML status:** OFF

Every official-domain URL was classified as safe. Every lookalike URL was classified as
scam or suspicious by the existing rules engine.

The 67-feature teammate model could not be enabled because no 20-feature serving contract
was available and its HTML/visual fields are not recomputable from a raw URL. A masked
67-feature benchmark comparison was therefore not possible without the training dataset
and model file.
