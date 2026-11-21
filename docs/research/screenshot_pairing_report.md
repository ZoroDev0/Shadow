# SHADOW Research: Zenodo Screenshot Pairing & Lazy Accessor Report

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 2 — Dataset Cleaning, Quality Auditing & Preprocessing  
**Date:** November 2026  

---

## 1. Executive Summary

Multimodal phishing detection in SHADOW combines lexical URL analysis, DOM HTML hierarchy inspection, and computer vision on rendered webpage screenshots. The premier visual resource in our corpus is the **Zenodo Multimodal Phishing Dataset (Record 21379702 / V2.0)**.

In our Phase 1 audit, we discovered that the dataset does not contain 21,311 images as casually assumed in some literature; rather, the underlying archive contains **exactly 7,062 `.png` screenshots**. Furthermore, mapping these screenshots to their corresponding URL and feature rows required solving the exact filename convention without corrupting the tabular metadata or exhausting local SSD storage.

This report documents our empirical discovery of the exact pairing formula, the construction of a zero-disk-overhead **Lazy Image Accessor**, and the validation of 7,062 high-quality multimodal training samples.

---

## 2. Screenshot Filename Structure and Pairing Discovery

Inside `Phishing dataset.zip`, screenshots are stored within the nested directory `Phishing dataset/data/screenshots/`. Inspection of the archive revealed 7,062 PNG files formatted as follows:

```text
{row_number}_{domain_or_path_sanitized}.png
```

Examples from the archive:
- `9_crediminuto.com.png`
- `12_usps.post-office-tracking.info.png`
- `29919_bankofamerica.secure-update.com.png`

### The Excel Offset Rule

When loading the accompanying metadata sheet `merged_features_final.xlsx`:
1. Row 1 of the Excel spreadsheet contains column headers (`URL`, `Label`, `URLLength`, etc.).
2. Data rows begin on Excel Row 2.
3. Therefore, for any Excel row $R$, the 0-indexed pandas DataFrame index is:

$$\text{df\_index} = R - 2$$

### Empirical Mapping Verification

We parsed all 7,062 image filenames in Python, extracted $R$, computed $\text{df\_index}$, and verified whether the domain extracted from the filename matched the `URL` domain in row $\text{df\_index}$ of `merged_features_final.xlsx`.

**Results:**
- **Total Screenshots in Archive:** 7,062 PNGs.
- **Direct Domain / Path Matches:** 7,032 (99.58%).
- **Minor Truncation / Edge Cases:** 30 (0.42%) (due to Windows filename length limits and URL query sanitization).
- **Unmapped / Dangling Screenshots:** Exactly 0.

This conclusively proves the mapping logic. We never assume that the 7,062 images correspond to the first 7,062 sequential rows; instead, they span rows 9 through 29,919.

---

## 3. Storage Optimization: The Compressed Lazy Image Accessor

Extracting all 7,062 screenshots (and other large raw assets) to disk would rapidly consume gigabytes of storage and clutter filesystem indexers. To maintain our strict reserve ($\ge 35\text{ GB}$ free SSD storage), we keep `Phishing dataset.zip` (1.47 GB) compressed and load images on demand directly from memory:

```python
import zipfile
import io
from PIL import Image

class LazyScreenshotAccessor:
    """Zero-disk-overhead batch reader for Zenodo screenshots inside ZIP archive."""
    def __init__(self, zip_path: str):
        self.zip_path = zip_path
        self._zip_file = None

    def _get_zip(self):
        if self._zip_file is None:
            self._zip_file = zipfile.ZipFile(self.zip_path, 'r')
        return self._zip_file

    def get_image(self, screenshot_rel_path: str) -> Image.Image:
        zf = self._get_zip()
        img_bytes = zf.read(screenshot_rel_path)
        return Image.open(io.BytesIO(img_bytes)).convert("RGB")

    def close(self):
        if self._zip_file:
            self._zip_file.close()
            self._zip_file = None
```

This accessor integrates directly with PyTorch `Dataset` and `DataLoader` abstractions for upcoming vision model training (ResNet/ViT).

---

## 4. Class Balance of the Paired Multimodal Dataset

We merged the 7,062 verified screenshot mappings with their corresponding rows in `merged_features_final.xlsx`.

| Partition / Class | Record Count | Percentage |
| :--- | :--- | :--- |
| **Legitimate Websites (is_phishing = 0)** | 3,745 | 53.03% |
| **Phishing Websites (is_phishing = 1)** | 3,317 | 46.97% |
| **Total Multimodal Paired Samples** | **7,062** | **100.00%** |

The paired dataset maintains a healthy, natural class balance (~53% legitimate vs. ~47% phishing), making it an ideal benchmark for multimodal fusion experiments without requiring synthetic rebalancing techniques like SMOTE.

---

## 5. Exported Multimodal Manifest

The curated multimodal index is exported to:
- `data/processed/zenodo_paired_multimodal.parquet` (3.11 MB)
- Schema: `url`, `registered_domain`, `excel_row`, `screenshot_filename`, `archive_internal_path`, `is_phishing`, and all 37 tabular features.
