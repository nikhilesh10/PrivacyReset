# PrivacyReset — Automated Browser Privacy & Digital Footprint Protection

A local-first Google Chrome Extension (Manifest V3) built to manage browser data cleanup, protect trusted sessions from accidental logouts, inspect browser fingerprinting exposure, scan local files/URLs for sensitive data, and run user-consented public footprint and breach metadata checks.

## Features (v1.0.0)

* **Module 1 — Browser Privacy Manager:**
  * Clear cookies/site data, browsing history, cached files, and local website storage on demand.
  * **Protected Websites Allowlist:** Normalize and exclude trusted `http`/`https` origins from cookies, cache, and local storage cleanup to prevent unwanted logouts.
  * **Scheduled Daily Cleanup:** Optional 24-hour background maintenance via `chrome.alarms` (off by default).
* **Module 2 — Local Browser Fingerprint Analysis:**
  * Inspect User-Agent, platform/hardware hints, screen resolution, color depth, timezone, languages, Canvas rendering hash, and WebGL vendor/renderer strings locally.
  * Provides plain-language exposure explanations and actionable mitigations without inventing an unsubstantiated uniqueness score.
* **Local URL & Document Privacy Analyzer:**
  * Strip tracking query parameters (`utm_*`, `fbclid`, `gclid`, `msclkid`, etc.) from URLs locally and flag unencrypted `http://` links.
  * Scan user-selected local files (`.txt`, `.csv`, `.json`, `.log`, `.md`, up to 2 MB) in browser memory for emails, phone numbers, IPv4 addresses, API token patterns, and long numeric IDs with zero uploads.
* **Module 3 — Consent-Based Digital Footprint Scanner:**
  * User-initiated checks against authorized public endpoints (GitHub Users REST API and Gravatar SHA-256 hash lookup).
  * Displays source URLs, check timestamps, exposed data categories, and distinguishes **Verified Matches** from **Possible Matches**.
* **Module 4 — Authorized Breach & Sensitive Data Exposure:**
  * Queries Have I Been Pwned public breach catalog metadata by service/domain name, or accepts a session-only user HIBP API key (held in RAM only, never saved to storage) for direct email breach metadata lookup.
  * Classifies breach `DataClasses` into **PII**, **PHI (Health)**, **Financial Information**, **Exposed Credentials**, and **Location-Related Information**.

## Architecture & Security Principles

* **Local-First Design:** Cleanup, allowlist storage (`chrome.storage.local`), fingerprint inspection, URL cleaning, and file scanning execute 100% locally.
* **Least-Privilege Permissions:** Uses only `storage`, `alarms`, and `browsingData`, plus scoped `host_permissions` (`api.github.com`, `en.gravatar.com`, `haveibeenpwned.com`) gated behind an explicit user consent toggle.
* **Zero Secret Persistence:** Never downloads leaked dumps, never retrieves or displays passwords, and never stores API keys, session tokens, government IDs, or financial credentials.

## Install in Chrome (Developer Mode)

1. Clone this repository:
   ```bash
   git clone [https://github.com/nikhilesh10/PrivacyReset.git](https://github.com/nikhilesh10/PrivacyReset.git)