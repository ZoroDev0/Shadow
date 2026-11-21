"""SHADOW Research: Verification Audit Engine.

Performs strict, reproducible calculations and inspections across all
downloaded datasets, hashes, metadata, and notebook outputs.
"""

import hashlib
import io
import json
import os
import re
import shutil
import sys
import zipfile
from collections import Counter
from pathlib import Path
import pandas as pd
import tldextract

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_RAW = PROJECT_ROOT / "data" / "raw"
REPORTS_DIR = PROJECT_ROOT / "ml-research" / "reports"
DOCS_RESEARCH = PROJECT_ROOT / "docs" / "research"

def get_file_hashes(file_path):
    md5 = hashlib.md5()
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            md5.update(chunk)
            sha256.update(chunk)
    return md5.hexdigest(), sha256.hexdigest()

def audit():
    print("=" * 80)
    print("SHADOW — STRICT VERIFICATION AUDIT")
    print(f"Project Root: {PROJECT_ROOT}")
    print("=" * 80)

    # -------------------------------------------------------------
    # 1. DISK SPACE & STORAGE
    # -------------------------------------------------------------
    total, used, free = shutil.disk_usage(PROJECT_ROOT)
    print(f"\n[1. STORAGE CHECK]")
    print(f"Total Disk:      {total / (1024**3):.2f} GB")
    print(f"Used Disk:       {used / (1024**3):.2f} GB")
    print(f"Free Disk:       {free / (1024**3):.2f} GB")
    print(f"Safety Reserve:  35.00 GB")
    print(f"Surplus:         {(free / (1024**3)) - 35.0:.2f} GB")

    # -------------------------------------------------------------
    # 2. AUDIT ZENODO ARCHIVE & RECORD 21379702
    # -------------------------------------------------------------
    print(f"\n[2. ZENODO ARCHIVE AUDIT]")
    zenodo_zip_path = DATA_RAW / "zenodo_multimodal" / "Phishing dataset.zip"
    if not zenodo_zip_path.exists():
        print("ERROR: Zenodo zip does not exist!")
    else:
        file_size = zenodo_zip_path.stat().st_size
        print(f"File Size: {file_size:,} bytes ({file_size / (1024**3):.2f} GB)")
        print("Calculating MD5 and SHA-256 (this reads 1.77 GB)...")
        z_md5, z_sha256 = get_file_hashes(zenodo_zip_path)
        print(f"Zenodo MD5:    {z_md5}")
        print(f"Zenodo SHA256: {z_sha256}")
        
        # Check extraction status
        extracted_dirs = [d for d in (DATA_RAW / "zenodo_multimodal").iterdir() if d.is_dir()]
        print(f"Extraction Status: {'Extracted into ' + str([d.name for d in extracted_dirs]) if extracted_dirs else 'NOT EXTRACTED (Archive only)'}")
        
        # Inspect contents inside the ZIP
        with zipfile.ZipFile(zenodo_zip_path, "r") as zf:
            namelist = zf.namelist()
            print(f"Total Entries in ZIP: {len(namelist):,}")
            
            # Categorize files
            dirs = [n for n in namelist if n.endswith("/")]
            files = [n for n in namelist if not n.endswith("/")]
            pngs = [n for n in files if n.lower().endswith(".png")]
            csvs = [n for n in files if n.lower().endswith(".csv")]
            others = [n for n in files if not n.lower().endswith(".png") and not n.lower().endswith(".csv")]
            
            print(f"  Directories:  {len(dirs):,}")
            print(f"  PNG Images:   {len(pngs):,}")
            print(f"  CSV Files:    {len(csvs):,}")
            print(f"  Other Files:  {len(others):,}")
            if csvs:
                print(f"  CSV filenames: {csvs}")
            if others:
                print(f"  Other filenames: {others[:10]}")
            
            # Check CSV row count inside Zenodo zip if any CSV exists
            for csv_name in csvs:
                with zf.open(csv_name) as cf:
                    df_z = pd.read_csv(cf)
                    print(f"  CSV '{csv_name}' shape: {df_z.shape}")

    # -------------------------------------------------------------
    # 3. RECALCULATING EMPIRICAL FINDINGS DIRECTLY
    # -------------------------------------------------------------
    print(f"\n[3. RECALCULATING EMPIRICAL CLAIMS]")
    
    # Claim A: OpenPhish Cloud Platform Percentage
    openphish_file = DATA_RAW / "openphish" / "feed.txt"
    if openphish_file.exists():
        with open(openphish_file, "r", encoding="utf-8", errors="ignore") as f:
            op_urls = [line.strip() for line in f if line.strip()]
        total_op = len(op_urls)
        
        cloud_keywords = [
            "workers.dev", "firebaseapp.com", "pages.dev", "weebly.com", "webflow.io",
            "glitch.me", "vercel.app", "netlify.app", "amazonaws.com", "azurewebsites.net",
            "wixsite.com", "sites.google.com", "drive.google.com", "sharepoint.com", "github.io"
        ]
        
        matches = []
        domain_list = []
        for u in op_urls:
            ext = tldextract.extract(u)
            reg_dom = f"{ext.domain}.{ext.suffix}".lower() if ext.suffix else ext.domain.lower()
            fqdn = ext.fqdn.lower()
            domain_list.append(reg_dom)
            
            # Check if any cloud keyword is in fqdn or URL
            is_cloud = any(k in fqdn for k in cloud_keywords)
            if is_cloud:
                matches.append(u)
                
        cloud_pct = (len(matches) / total_op) * 100 if total_op else 0
        print(f"Claim A (OpenPhish Cloud Hosting):")
        print(f"  Total URLs in feed.txt:     {total_op}")
        print(f"  Matched Cloud Providers:    {len(matches)}")
        print(f"  Actual Cloud Percentage:    {cloud_pct:.2f}%")
        print(f"  Keywords Tested:            {cloud_keywords}")
        top_op_domains = Counter(domain_list).most_common(10)
        print(f"  Top Registered Domains in OpenPhish: {top_op_domains}")

    # Claim B: Zenodo Screenshot Availability Percentage
    # Earlier reported: 21,311 / 60,000 = 35.5%
    print(f"\nClaim B (Zenodo Screenshot Availability):")
    if zenodo_zip_path.exists():
        with zipfile.ZipFile(zenodo_zip_path, "r") as zf:
            namelist = zf.namelist()
            pngs = [n for n in namelist if n.lower().endswith(".png")]
            csvs = [n for n in namelist if n.lower().endswith(".csv")]
            print(f"  Actual PNG images in downloaded archive: {len(pngs):,}")
            if csvs:
                with zf.open(csvs[0]) as cf:
                    df_z = pd.read_csv(cf)
                    print(f"  Actual URLs in Zenodo CSV ({csvs[0]}): {len(df_z):,}")
                    print(f"  Ratio (PNG / URLs in CSV): {len(pngs) / len(df_z) * 100:.2f}%")
            else:
                print(f"  No CSV found inside ZIP! Checking reported denominator (60,000)...")
                print(f"  Ratio against 60,000: {len(pngs) / 60000 * 100:.2f}%")

    # Claim C: PhishTank Target-Brand Distribution
    pt_file = DATA_RAW / "phishtank" / "online-valid.csv"
    if pt_file.exists():
        print(f"\nClaim C (PhishTank Target Brands):")
        df_pt = pd.read_csv(pt_file)
        total_pt = len(df_pt)
        print(f"  Total Rows: {total_pt:,}")
        target_col = df_pt["target"]
        missing_targets = target_col.isnull().sum()
        non_null_targets = target_col.dropna()
        other_targets = (non_null_targets == "Other").sum()
        known_targets = non_null_targets[non_null_targets != "Other"]
        
        print(f"  Missing (NaN) Targets: {missing_targets:,} ({missing_targets/total_pt*100:.2f}%)")
        print(f"  Generic 'Other' Targets: {other_targets:,} ({other_targets/total_pt*100:.2f}%)")
        print(f"  Known Named Targets: {len(known_targets):,} ({len(known_targets)/total_pt*100:.2f}%)")
        
        print("\n  Top 15 Targets (all non-null):")
        for brand, count in target_col.value_counts().head(15).items():
            print(f"    - {brand}: {count:,} ({count/total_pt*100:.2f}% of total, {count/len(non_null_targets)*100:.2f}% of non-null)")
            
        print("\n  Top 10 Targets (excluding 'Other'):")
        for brand, count in known_targets.value_counts().head(10).items():
            print(f"    - {brand}: {count:,} ({count/len(known_targets)*100:.2f}% of known named)")

    # -------------------------------------------------------------
    # 4. REVIEW ALL DOWNLOADED DATASETS
    # -------------------------------------------------------------
    print(f"\n[4. COMPREHENSIVE DATASET PROFILES]")

    # 4.1 PhiUSIIL
    phiusiil_csv = DATA_RAW / "uci_phiusiil" / "PhiUSIIL_Phishing_URL_Dataset.csv"
    if phiusiil_csv.exists():
        df_phi = pd.read_csv(phiusiil_csv)
        print(f"\n--- PhiUSIIL Phishing URL Dataset ---")
        print(f"  Rows: {df_phi.shape[0]:,}, Columns: {df_phi.shape[1]}")
        print(f"  Label distribution: {df_phi['label'].value_counts().to_dict()}")
        print(f"  Duplicate rows (exact): {df_phi.duplicated().sum()}")
        print(f"  Duplicate URLs: {df_phi['URL'].duplicated().sum() if 'URL' in df_phi else 'N/A'}")
        print(f"  Missing values across all cells: {df_phi.isnull().sum().sum()}")
        if 'URL' in df_phi:
            phi_ext = df_phi['URL'].head(1000).apply(lambda u: tldextract.extract(str(u)).domain)
            print(f"  Sample domain count in first 1000 URLs: {phi_ext.nunique()}")

    # 4.2 UCI Phishing Websites (327)
    pw_arff = DATA_RAW / "uci_phishing_websites" / "Training Dataset.arff"
    if pw_arff.exists():
        print(f"\n--- UCI Phishing Websites (327) ---")
        with open(pw_arff, "r", encoding="utf-8", errors="ignore") as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith("@") and not l.startswith("%")]
        print(f"  Total Data Instances: {len(lines):,}")
        classes = Counter(l.split(",")[-1].strip() for l in lines)
        print(f"  Class Distribution: {dict(classes)}")

    # 4.3 UCI Website Phishing (379)
    wp_arff = DATA_RAW / "uci_website_phishing" / "PhishingData.arff"
    if wp_arff.exists():
        print(f"\n--- UCI Website Phishing (379) ---")
        with open(wp_arff, "r", encoding="utf-8", errors="ignore") as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith("@") and not l.startswith("%")]
        print(f"  Total Data Instances: {len(lines):,}")
        classes = Counter(l.split(",")[-1].strip() for l in lines)
        print(f"  Class Distribution: {dict(classes)}")

    # 4.4 PhreshPhish Bounded Sample
    phresh_parquet = DATA_RAW / "phreshphish_sample" / "test-000.parquet"
    if phresh_parquet.exists():
        print(f"\n--- PhreshPhish Bounded Sample ---")
        df_phr = pd.read_parquet(phresh_parquet)
        print(f"  Rows: {len(df_phr):,}, Columns: {list(df_phr.columns)}")
        print(f"  Label distribution: {df_phr['label'].value_counts().to_dict()}")
        print(f"  Duplicate URLs: {df_phr['url'].duplicated().sum()}")
        print(f"  Missing values: {df_phr.isnull().sum().to_dict()}")
        print(f"  Date range: {df_phr['date'].min()} to {df_phr['date'].max() if 'date' in df_phr else 'N/A'}")
        print(f"  Sample HTML length: min {df_phr['html'].str.len().min()}, max {df_phr['html'].str.len().max()}, mean {df_phr['html'].str.len().mean():.0f}")

    # 4.5 PhishTank
    if pt_file.exists():
        print(f"\n--- PhishTank Online Valid ---")
        print(f"  Rows: {len(df_pt):,}")
        print(f"  Unique URLs: {df_pt['url'].nunique():,}")
        print(f"  Duplicate URLs: {df_pt['url'].duplicated().sum():,}")
        print(f"  Unique phish_id: {df_pt['phish_id'].nunique():,}")
        if 'verified' in df_pt:
            print(f"  Verified status: {df_pt['verified'].value_counts().to_dict()}")
        if 'online' in df_pt:
            print(f"  Online status: {df_pt['online'].value_counts().to_dict()}")
        if 'submission_time' in df_pt:
            print(f"  Submission time range: {df_pt['submission_time'].min()} to {df_pt['submission_time'].max()}")

    # 4.6 OpenPhish
    if openphish_file.exists():
        print(f"\n--- OpenPhish Feed ---")
        print(f"  Total URLs: {len(op_urls):,}")
        print(f"  Unique URLs: {len(set(op_urls)):,}")
        print(f"  Duplicate URLs: {len(op_urls) - len(set(op_urls))}")

    # -------------------------------------------------------------
    # 5. DATASET OVERLAP ANALYSIS
    # -------------------------------------------------------------
    print(f"\n[5. URL OVERLAP ANALYSIS ACROSS DATASETS]")
    urls_pt = set(df_pt["url"].dropna()) if pt_file.exists() else set()
    urls_op = set(op_urls) if openphish_file.exists() else set()
    urls_phi = set(df_phi["URL"].dropna()) if phiusiil_csv.exists() and 'URL' in df_phi else set()
    urls_phr = set(df_phr["url"].dropna()) if phresh_parquet.exists() else set()

    print(f"  PhishTank URL count: {len(urls_pt):,}")
    print(f"  OpenPhish URL count: {len(urls_op):,}")
    print(f"  PhiUSIIL URL count:  {len(urls_phi):,}")
    print(f"  PhreshPhish URL count: {len(urls_phr):,}")

    pt_op_overlap = urls_pt.intersection(urls_op)
    pt_phi_overlap = urls_pt.intersection(urls_phi)
    op_phi_overlap = urls_op.intersection(urls_phi)
    phr_pt_overlap = urls_phr.intersection(urls_pt)

    print(f"  Overlap (PhishTank & OpenPhish): {len(pt_op_overlap):,} URLs")
    print(f"  Overlap (PhishTank & PhiUSIIL):  {len(pt_phi_overlap):,} URLs")
    print(f"  Overlap (OpenPhish & PhiUSIIL):  {len(op_phi_overlap):,} URLs")
    print(f"  Overlap (PhreshPhish & PhishTank): {len(phr_pt_overlap):,} URLs")

    # Domain overlap
    def get_domains(url_set):
        doms = set()
        for u in url_set:
            ext = tldextract.extract(str(u))
            if ext.domain and ext.suffix:
                doms.add(f"{ext.domain}.{ext.suffix}".lower())
        return doms

    doms_pt = get_domains(urls_pt)
    doms_op = get_domains(urls_op)
    doms_phi = get_domains(urls_phi)
    doms_phr = get_domains(urls_phr)

    print(f"\n  Registered Domain Counts:")
    print(f"    PhishTank:   {len(doms_pt):,} domains")
    print(f"    OpenPhish:   {len(doms_op):,} domains")
    print(f"    PhiUSIIL:    {len(doms_phi):,} domains")
    print(f"    PhreshPhish: {len(doms_phr):,} domains")

    dom_pt_phi = doms_pt.intersection(doms_phi)
    dom_op_phi = doms_op.intersection(doms_phi)
    dom_pt_op = doms_pt.intersection(doms_op)
    print(f"  Domain Overlap (PhishTank & PhiUSIIL): {len(dom_pt_phi):,} shared domains")
    print(f"  Domain Overlap (OpenPhish & PhiUSIIL): {len(dom_op_phi):,} shared domains")
    print(f"  Domain Overlap (PhishTank & OpenPhish): {len(dom_pt_op):,} shared domains")

    # -------------------------------------------------------------
    # 6. CHECKSUM VERIFICATION OF ALL FILES
    # -------------------------------------------------------------
    print(f"\n[6. ACTUAL SHA-256 CHECKSUM OF ALL DATA FILES]")
    manifest_file = REPORTS_DIR / "dataset_download_manifest.json"
    manifest_records = {}
    if manifest_file.exists():
        with open(manifest_file, "r", encoding="utf-8") as f:
            for item in json.load(f):
                manifest_records[item["file_path"].replace("/", "\\")] = item["sha256"]

    for root, _, files in os.walk(DATA_RAW):
        for f in sorted(files):
            if f.endswith(".part"):
                continue
            full_path = Path(root) / f
            rel_path = str(full_path.relative_to(PROJECT_ROOT)).replace("/", "\\")
            sha = hashlib.sha256(open(full_path, "rb").read()).hexdigest()
            size = full_path.stat().st_size
            expected_sha = manifest_records.get(rel_path, "N/A (Extracted/Secondary)")
            match = "MATCH" if sha == expected_sha else ("MISMATCH" if expected_sha != "N/A (Extracted/Secondary)" else "NO_MANIFEST_ENTRY")
            print(f"  {rel_path} ({size:,} B)")
            print(f"    Actual:   {sha}")
            print(f"    Manifest: {expected_sha} [{match}]")

if __name__ == "__main__":
    audit()
