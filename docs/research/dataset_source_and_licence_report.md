# SHADOW Research Report: Dataset Source & Licence Verification

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Engine)  
**Phase:** Dataset Discovery & Acquisition  
**Date:** November 2026  
**Author:** SHADOW Lead Development & Research Team  

---

## 1. Executive Summary & Research Context

As part of the SHADOW project, our engineering goal is to build a unified detection backend capable of protecting users across three client applications:
1. **Chrome Extension** (real-time browsing protection and URL/DOM heuristics)
2. **Web Application** (URL scanning, domain reputation, and telemetry dashboard)
3. **Android Application** (mobile URL scanning and SMS/messaging link triage)

To train robust machine learning models across multiple modalities (URL strings, webpage HTML structure, screenshots, and live reputation feeds), we conducted an exhaustive investigation into candidate cybersecurity datasets. 

Before introducing external data into our pipeline, we established a strict verification protocol:
- **Licence authenticity:** We verify the exact legal terms from official dataset pages, paper publications, and repository metadata.
- **Commercial vs. Research Use:** While SHADOW is currently an educational and research project, our architecture must remain legally unencumbered if deployed publicly.
- **Redistribution Terms:** We separate our project code licence (e.g., MIT/Apache 2.0) from raw data licences, ensuring third-party data is never redistributed improperly.
- **Storage Constraints:** Our development hardware features a 256 GB SSD (maintaining a mandatory $\ge 35\text{ GB}$ reserve) and 24 GB RAM. We avoid unconstrained downloads of massive multi-gigabyte corpora when bounded sampling is more appropriate.

---

## 2. Dataset Legal & Source Audit Matrix

| Dataset Identifier | Official Hosting Platform | Primary Authors / Publishers | Official Licence | Commercial Use Permitted? | Attribution Required? | Usage Conditions & Restrictions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`uci_phiusiil`** | UCI Machine Learning Repository | Arvind Prasad, Shalini Chandra (2024) | Creative Commons Attribution 4.0 International (**CC BY 4.0**) | Yes | Yes (Cite original paper in *Computers & Security*) | Unrestricted sharing and adaptation with citation. |
| **`zenodo_multimodal_21379702`** | Zenodo (CERN Repository) | Devendra Kumar Yadav et al. (2024) | Creative Commons Attribution 4.0 International (**CC BY 4.0**) | Yes | Yes (Cite Zenodo DOI: `10.5281/zenodo.21379702`) | Unrestricted sharing and adaptation with citation. |
| **`phreshphish_hf`** | Hugging Face (`phreshphish/phreshphish`) | PhreshPhish Team (arXiv:2507.10854, 2025) | Creative Commons Attribution 4.0 International (**CC BY 4.0**) | Conditioned | Yes (Cite arXiv publication) | Explicit author restriction: **strictly for anti-phishing research**. |
| **`mendeley_legitphish`** | Mendeley Data | Rachana S. Potpelwar et al. (Data in Brief, 2025) | Creative Commons Attribution 4.0 International (**CC BY 4.0**) | Yes | Yes (Cite DOI: `10.17632/hx4m73v2sf.2`) | Open academic sharing and adaptation with attribution. |
| **`uci_phishing_websites_327`** | UCI Machine Learning Repository | Rami Mohammad, Fadi Thabtah, Lee McCluskey (2015) | Creative Commons Attribution 4.0 International (**CC BY 4.0**) | Yes | Yes (Cite 2012 ICITST & 2015 publications) | Open academic use with attribution. |
| **`uci_website_phishing_379`** | UCI Machine Learning Repository | Neda Abdelhamid, A. Ayesh, Fadi Thabtah (2014) | Creative Commons Attribution 4.0 International (**CC BY 4.0**) | Yes | Yes (Cite 2014 publication) | Open academic use with attribution. |
| **`openphish_community`** | OpenPhish Feed | OpenPhish Research Team | OpenPhish Community Terms | **No** (Non-commercial only) | Yes (Explicit OpenPhish credit) | Free for academic, personal, and non-commercial security research. Redistribution prohibited. |
| **`phishtank_online_valid`** | PhishTank (Cisco OpenDNS) | PhishTank Community & Cisco Systems | PhishTank Developer Agreement | Conditional | Yes (Cite PhishTank) | Free for research and personal use. Automated crawlers must pass custom `User-Agent`. |
| **`urlhaus_abuse_ch`** | abuse.ch | abuse.ch Community | **CC0 1.0 Universal** (Public Domain) | Yes | Optional (Credit appreciated) | Open data, but bulk export requires free registered `Auth-Key` under API v2. |
| **`web2vec_mendeley`** | Mendeley Data | Damian Frąszczak, Edyta Fraszczak (2024) | Creative Commons Attribution 4.0 International (**CC BY 4.0**) | Yes | Yes (Cite DOI: `10.17632/8ws5vb8w2n.1`) | Open sharing and feature extraction adaptation with attribution. |
| **`phishpedia_usenix`** | GitHub (`lindsey98/Phishpedia`) | Ruofan Liu et al. (USENIX Security 2021) | Academic / Research Use Only | **No** | Yes (Cite USENIX Security '21) | Intended solely for academic evaluation; hosted on Google Drive subject to quota blocks. |

---

## 3. In-Depth Analysis of Individual Datasets

### 3.1 PhiUSIIL Phishing URL Dataset (UCI ID: 967)
- **Source Assessment:** Hosted on the prestigious UCI Machine Learning Repository (donated in March 2024).
- **Licence Terms:** CC BY 4.0. We are free to share, copy, and transform the material for any purpose, provided appropriate credit is given to the creators (Arvind Prasad and Shalini Chandra).
- **Research Role:** Primary candidate for tabular baseline modeling. It includes 235,795 URLs with 46 rich features extracted from URL strings and webpage content.
- **Safety & Handling:** The raw dataset contains URLs and extracted numerical/boolean indicators. No live malicious scripts are executed.

### 3.2 Phishing and Legitimate Websites Dataset V2.0 (Zenodo: 21379702)
- **Source Assessment:** Published on Zenodo by Yadav et al. in late 2024.
- **Licence Terms:** CC BY 4.0. Open for research and development.
- **Multimodal Value:** Unlocks multimodal visual phishing research by pairing 60,000 URLs with 7,062 rendered website screenshots and 18 lexical features (XLSX).
- **Safety & Handling:** Website screenshots are stored as static PNG images. Images are safely loaded using PIL/OpenCV without any browser DOM rendering.

### 3.3 PhreshPhish (Hugging Face / arXiv:2507.10854)
- **Source Assessment:** Hugging Face repository created by researchers to provide high-quality HTML-URL pairs (over 666,000 samples).
- **Licence Terms:** CC BY 4.0, but with an explicit author stipulation that it is strictly intended for **anti-phishing research**.
- **Storage Strategy:** Because the complete corpus is 36.6 GB (which would severely challenge our 256 GB drive and violate our 35 GB free reserve rule), we implement **bounded streaming** to acquire verified sample partitions rather than the uncompressed full archive.
- **Safety & Handling:** Contains raw HTML documents. We enforce **strict static parsing only** via BeautifulSoup and regex. Scripts and iframes are never executed.

### 3.4 OpenPhish Community Feed & PhishTank
- **Source Assessment:** Premier live threat intelligence feeds. OpenPhish updates every 12 to 24 hours with active in-the-wild zero-day attacks. PhishTank provides human-voted verified phishing URLs with submission timestamps and target brands.
- **Licence Terms:**
  - OpenPhish Community is strictly for non-commercial research; redistribution of the raw feed is forbidden.
  - PhishTank is free for academic/developer research under Cisco's terms, requiring a meaningful `User-Agent`.
- **Research Role:** Used strictly for out-of-sample zero-day testing and brand targeting analysis.

### 3.5 URLhaus (abuse.ch API v2)
- **Status:** *Licence Clear (CC0), but Acquisition Conditioned on API Key.*
- **Findings:** abuse.ch recently migrated all bulk export endpoints from open keyless downloads to authenticated API v2 paths (`https://urlhaus-api.abuse.ch/v2/files/exports/<AUTH-KEY>/recent.csv`). Legacy links return HTTP 410 Gone.
- **Action Taken:** We have documented the API setup instructions in `unavailable_datasets.md`. Once the user registers a free account on `auth.abuse.ch`, adding `URLHAUS_API_KEY` to `.env` enables automated ingestion.

---

## 4. Separation of Project Code vs. Data Licences

Our project repository adheres to standard open-source hygiene:
1. **Source Code:** Software developed for SHADOW (FastAPI backend, Chrome extension, Android app, ML pipelines) is released under a permissive open-source licence (e.g., Apache 2.0 or MIT).
2. **Third-Party Data:** All external datasets remain in `data/raw/` (ignored by git via `.gitignore`), governed by their respective original licences (CC BY 4.0, OpenPhish Community Terms, PhishTank Terms).
3. **No Redistribution of Raw Intelligence:** Neither raw threat intelligence feeds nor copyrighted website assets are packaged into public releases. Model weights will only capture learned statistical representations.

---

## 5. Conclusions & Next Steps

Our licence verification confirms that our primary candidates (**PhiUSIIL**, **Zenodo V2.0 Multimodal**, **UCI Phishing 327**, and **LegitPhish**) operate under **CC BY 4.0**, ensuring full freedom to develop and benchmark our models. 

Our threat intelligence sources (**OpenPhish** and **PhishTank**) are fully authorized for our university research scope. We are proceeding with static data quality inspection and schema normalization.
