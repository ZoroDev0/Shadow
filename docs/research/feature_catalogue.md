# SHADOW Research: Multimodal Feature Catalogue

**Project:** SHADOW (Student-Built Multimodal Cybersecurity & Phishing Detection Platform)  
**Phase:** Phase 3 — Feature Engineering & Signal Extraction  
**Date:** November 2026  
**Author:** Lead ML Research Assistant  

---

## 1. Overview of Multimodal Signal Architecture

The SHADOW detection engine evaluates incoming web content across four distinct observation layers:
1. **URL Intelligence (Lexical & Structural)**: Extremely fast ($>30,000\text{ URLs/s}$), privacy-preserving, first-line triage.
2. **HTML Intelligence (Static DOM Semantic)**: Deep structural inspection of forms, credential inputs, cross-origin targets, and scripting without dynamic JavaScript execution.
3. **Visual Intelligence (Deep Vision Embeddings)**: Pretrained convolutional feature representations (ResNet-18 and MobileNetV3) extracted from rendered website screenshots via a zero-disk-overhead compressed archive accessor.
4. **Browser Behaviour Intelligence (Dynamic Telemetry)**: Multi-hop redirection monitoring, cross-origin navigation events, and rogue form action detection.

---

## 2. Modality 1: URL Intelligence Features (20 Features)

Extracted from raw URLs via lexical analysis, Public Suffix List domain decomposition (`tldextract`), and regex parsing.

| Feature Identifier | Type | Range / Values | Description & Cyber Threat Significance |
| :--- | :--- | :--- | :--- |
| `url_length` | Integer | $[10, \infty)$ | Total character count. Phishing URLs frequently exceed 75 characters due to embedded tokens and subdomains. |
| `hostname_length` | Integer | $[3, 255]$ | Length of the netloc/host. Excessive length indicates brand spoofing or nested subdomain abuse. |
| `path_length` | Integer | $[0, \infty)$ | Length of URL path. Phishing sites often nest fake directories (e.g. `/secure/login/auth/`). |
| `query_length` | Integer | $[0, \infty)$ | Length of the parameter string. Attackers encode victim emails or tracking IDs in query strings. |
| `shannon_entropy` | Float | $[0.0, 8.0]$ | Information entropy $H = -\sum p_i \log_2(p_i)$. High entropy ($>4.5$) indicates DGA or random tokens. |
| `digit_ratio` | Float | $[0.0, 1.0]$ | Ratio of numeric digits to total length. Attackers use numeric IP substitutes or pseudo-random hashes. |
| `special_char_ratio` | Float | $[0.0, 1.0]$ | Ratio of non-alphanumeric characters (`-`, `_`, `=`, `%`, `?`). High in complex obfuscated URLs. |
| `subdomain_depth` | Integer | $[0, 10]$ | Count of subdomain components. High depth (e.g. `paypal.com.verify.account.xyz`) signals deceptive routing. |
| `is_ip_address` | Binary | $\{0, 1\}$ | Flag for IPv4/IPv6 address instead of a domain name. Direct IP access is overwhelmingly malicious. |
| `suspicious_keyword_count` | Integer | $[0, \infty)$ | Matches against deceptive words (`login`, `verify`, `banking`, `secure`, `account`, `wallet`). |
| `has_url_encoding` | Binary | $\{0, 1\}$ | Indicates percent-encoding (`%20`, `%2f`). Used to bypass simple lexical keyword filters. |
| `has_at_symbol` | Binary | $\{0, 1\}$ | Flag for `@`. Browsers interpret `http://trusted.com@evil.com` as routing to `evil.com`. |
| `has_double_slash_redirect` | Binary | $\{0, 1\}$ | Path contains `//`, indicating redirection or path traversal attempt. |
| `num_subdirectories` | Integer | $[0, 20]$ | Count of directory segments (`/`). Deep structures disguise phishing kits on compromised servers. |
| `num_query_params` | Integer | $[0, 50]$ | Count of key-value query parameters (`?key=val&k2=v2`). |
| `is_https` | Binary | $\{0, 1\}$ | Protocol scheme. Over 80% of modern phishing sites use free Let's Encrypt SSL/TLS certificates. |
| `has_punycode` | Binary | $\{0, 1\}$ | Presence of `xn--` prefix indicating Internationalized Domain Name (IDN) homograph attacks. |
| `tld_length` | Integer | $[2, 24]$ | Length of the top-level domain suffix (e.g. `com`=3, `accountant`=10). Cheap TLDs often have longer suffixes. |
| `hyphen_count_hostname` | Integer | $[0, 10]$ | Number of hyphens in hostname. Spoofed domains heavily use hyphens (e.g. `apple-id-verify.com`). |
| `vowel_consonant_ratio` | Float | $[0.0, \infty)$ | Ratio of vowels to consonants in the registered domain. Low ratios indicate random character strings. |

---

## 3. Modality 2: HTML Intelligence Features (13 Features)

Extracted through safe static DOM parsing via `BeautifulSoup(html, "html.parser")` with zero JavaScript execution.

| Feature Identifier | Type | Range / Values | Description & Cyber Threat Significance |
| :--- | :--- | :--- | :--- |
| `html_size_bytes` | Integer | $[0, \infty)$ | Raw document size in bytes. Phishing templates are often lightweight ($<50\text{ KB}$) clones. |
| `num_forms` | Integer | $[0, \infty)$ | Count of `<form>` elements. Essential for capturing user input. |
| `num_password_inputs` | Integer | $[0, 10]$ | Count of `<input type="password">` fields. Signature signal of credential theft. |
| `num_hidden_inputs` | Integer | $[0, 50]$ | Count of `<input type="hidden">` fields. Used by phishing kits to pass campaign tokens. |
| `num_text_inputs` | Integer | $[0, 20]$ | Count of text and email input fields. |
| `num_iframes` | Integer | $[0, 20]$ | Count of `<iframe>` tags. Used for clickjacking, credential overlay, or external frame injection. |
| `num_external_scripts` | Integer | $[0, 50]$ | Script tags loading JS from third-party domains distinct from the hosting domain. |
| `has_meta_refresh` | Binary | $\{0, 1\}$ | Client-side redirection via `<meta http-equiv="refresh">`. Used to evade sandbox crawlers. |
| `has_cross_origin_form` | Binary | $\{0, 1\}$ | Form `action` submits POST data to an external registered domain. Strongest signal of data exfiltration. |
| `has_empty_or_hash_form_action` | Binary | $\{0, 1\}$ | Form action is `#`, empty, or `about:blank`. JavaScript intercepts submission to submit data via AJAX. |
| `form_action_is_ip` | Binary | $\{0, 1\}$ | Form action points directly to an IPv4/IPv6 address. |
| `num_external_hyperlinks` | Integer | $[0, \infty)$ | Anchor tags (`<a href>`) pointing to external domains. Phishing pages copy legitimate links to look genuine. |
| `has_popup_window` | Binary | $\{0, 1\}$ | Inline script contains `window.open` or `alert`. Used for rogue alerts and fake authentication popups. |

---

## 4. Modality 3: Visual Intelligence Embeddings (Pretrained CNNs)

Extracted from rendered $224 \times 224$ RGB website screenshots using PyTorch on CUDA.

| Architecture | Embedding Dimension | Output Tensor Shape | Model Parameters | Primary Use Case in SHADOW |
| :--- | :--- | :--- | :--- | :--- |
| **ResNet-18** | **512 dimensions** | `(N, 512)` | 11.69M | Comprehensive visual representation for multimodal fusion; captures layout geometry, visual hierarchy, and brand logos. |
| **MobileNetV3-Small** | **576 dimensions** | `(N, 576)` | 2.54M | Ultra-lightweight edge inference for the Chrome Extension and Android client application. |

---

## 5. Modality 4: Browser Behaviour Telemetry Schema (9 Features)

Runtime client-side telemetry captured during page navigation and user interaction.

| Feature Identifier | Type | Range / Values | Telemetry Source & Description |
| :--- | :--- | :--- | :--- |
| `redirect_count` | Integer | $[0, 10]$ | Navigation timing API. Number of HTTP/JS redirects before final landing. |
| `has_cross_origin_redirect` | Binary | $\{0, 1\}$ | Navigation history. At least one redirect changed the registered domain. |
| `num_navigation_hops` | Integer | $[1, 10]$ | Total chain length of navigation events. |
| `has_cross_origin_form_post` | Binary | $\{0, 1\}$ | Form submission interceptor. Form submission target does not match current origin. |
| `page_dwell_time_ms` | Integer | $[0, \infty)$ | Session timer. Time user spends on page before navigating away or submitting. |
| `num_network_requests` | Integer | $[0, \infty)$ | Resource timing API. Total background fetch/XHR requests made during initial load. |
| `num_storage_writes` | Integer | $[0, 20]$ | Storage observer. Writes to `localStorage` or `sessionStorage`. |
| `suspicious_dom_manipulation_count`| Integer | $[0, 20]$ | MutationObserver. Count of stealthily injected inputs or hidden overlays. |
| `scenario` | String | Categorical | Threat profile identifier (`Benign_Direct`, `Benign_OAuth`, `Phishing_Cloaked`, etc.). |
