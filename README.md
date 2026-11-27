# PrivacyReset

A local-first Chrome Extension (Manifest V3) for browser privacy management, fingerprint exposure assessment, and local data inspection.

## Current features (v0.3.0)

* **Module 1 — Browser privacy manager:** Clear cookies/site data, browsing history, cached files, and local website storage on demand or via an optional 24-hour `chrome.alarms` schedule.
* **Protected websites allowlist:** Exclude trusted origins from cookies, cache, and local storage cleanup to prevent unwanted logouts.
* **Module 2 — Local browser fingerprint analysis:** Inspect User-Agent, platform/hardware hints, screen resolution, color depth, timezone, languages, Canvas rendering hash, and WebGL vendor/renderer locally with exposure explanations and mitigations.
* **Local URL & document privacy analyzer:** Strip tracking parameters (`utm_*`, `fbclid`, `gclid`, etc.) from URLs and scan user-selected local files (`.txt`, `.csv`, `.json`, `.log`, `.md`) in memory for emails, phone numbers, IPv4 addresses, API key patterns, and long numeric IDs with zero uploads.
* **Minimal permissions:** Uses only `storage`, `alarms`, and `browsingData` with zero telemetry or remote backend.

## Install in Chrome

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `PrivacyReset` folder.
5. Pin PrivacyReset from the Extensions menu.

## Important behavior and limitations

* **Global browsing history cleanup:** Chrome's `chrome.browsingData.remove()` API supports `excludeOrigins` for **cookies**, **cache**, and **localStorage**, but not for **browsing history**. Selecting Browsing History clears history globally across all websites.
* **Fingerprint exposure assessment:** Reports observable signals locally without inventing a uniqueness percentage without representative population data, and does not claim guaranteed anonymity.
* **Local file scanning:** Files are read strictly in browser memory (`File.text()`) and never transmitted externally.

## Development roadmap

* [x] **v0.1.0** — Core browser data cleanup and daily scheduler
* [x] **v0.2.0** — Protected websites allowlist and Chrome API exclusion safeguards
* [x] **v0.3.0** — Tabbed UI, local browser fingerprint analysis, and local URL/document privacy scanner
* [ ] **v0.4.0** — Module 3 & Module 4: User-consented digital footprint and authorized breach-intelligence checks
* [ ] **v1.0.0** — Final integration, permission audit, and portfolio release

## Security principles

* Least privilege permissions.
* Explicit user consent before external network requests or destructive cleanup.
* No collection or storage of passwords, session tokens, government IDs, or financial credentials.
* Distinguish verified findings from possible matches.