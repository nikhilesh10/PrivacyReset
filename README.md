# PrivacyReset

A local-first Chrome Extension (Manifest V3) for browser privacy management and digital footprint protection.

## Current features (v0.2.0)

* **Manual browser cleanup:** Clear cookies/site data, browsing history, cached files, and local website storage.
* **Protected websites allowlist:** Add domains (normalized to `http` or `https` origins) to protect active sessions and preferences during cleanup.
* **Scheduled daily cleanup:** Optional 24-hour background cleanup powered by `chrome.alarms` (off by default).
* **Local-first architecture:** Uses minimal permissions (`storage`, `alarms`, `browsingData`) with zero analytics, tracking, or external backend.

## Install in Chrome

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the `PrivacyReset` folder.
5. Pin PrivacyReset from the Extensions menu.

## Important behavior and limitations

* **Protected websites exclusions:** Chrome's `chrome.browsingData.remove()` API supports `excludeOrigins` for **cookies**, **cache**, and **localStorage**.
* **Global browsing history limitation:** Chrome does not support origin exclusions for **browsing history**. When Browsing History is selected, Chrome clears history globally across all websites, including protected ones.
* **Scheduled cleanup:** Disabled by default. When enabled, it runs every 24 hours using your saved category selections and protected websites list. Chrome may adjust alarm timing depending on browser or device state.

## Development roadmap

* [x] **v0.1.0** — Core browser data cleanup and daily scheduler
* [x] **v0.2.0** — Protected websites allowlist and Chrome API exclusion safeguards
* [ ] **v0.3.0** — Module 2: Local browser fingerprint exposure analysis
* [ ] **v0.4.0** — Module 3: User-initiated digital footprint and PII scanner
* [ ] **v0.5.0** — Module 4: Authorized breach-intelligence checks
* [ ] **v0.6.0** — Local-only document and URL privacy analysis

## Security principles

* Least privilege permissions.
* Explicit user consent for scans and cleanup.
* No collection or storage of passwords, session tokens, government IDs, or financial credentials.
* No continuous GPS tracking.
* Distinguish verified findings from possible matches.