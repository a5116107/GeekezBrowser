# GeekEZ Browser

<div align="center">

<img src="icon.png" width="100" height="100" alt="GeekEZ Logo">

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

**A stealthy anti-detect browser for e-commerce and multi-account management.**

[中文说明](docs/README_zh.md) | [Download](https://github.com/EchoHS/GeekezBrowser/releases)

</div>

---

## Introduction

**GeekEZ Browser** is built on **Electron** and **Puppeteer**, with **Xray-core** integrated for proxy and routing capabilities.

It is designed for operators who need multi-account isolation across platforms such as Amazon, TikTok, Facebook, and Shopee. The project focuses on profile isolation, proxy consistency, and workflow automation.

## Screenshots

<div align="center">

<img src="docs/Main Interface1.png" alt="Main Interface 1" width="800">
<img src="docs/Main Interface2.png" alt="Main Interface 2" width="800">

*Main interface - profile management*

</div>

## Key Features

### Fingerprint Isolation
- Hardware randomization for CPU cores and memory per profile.
- Timezone and geolocation controls with auto-match mode.
- Language spoofing support with browser and header alignment.
- WebRTC leak protection via proxy-safe policy.

### Network Engine (Xray-core)
- Protocols: VMess, VLESS, Trojan, Shadowsocks, Socks5, HTTP.
- Advanced transport support: REALITY, XHTTP, gRPC, mKCP, WebSocket, H2.
- Pre-proxy chain mode: local -> pre-proxy -> target node -> web.
- IPv4/IPv6 routing compatibility.

### Workflow and Management
- Chrome extension import for isolated profiles.
- Tag-based profile organization.
- Dynamic watermark for profile identification.
- Multi-profile parallel launch with isolated ports/processes.
- Optional local REST API (`/api/*`) for automation.

## Cookie API (Advanced)

Authentication header:

- `X-GeekEZ-API-Token`

Core endpoints:

- `GET /api/profiles/:idOrName/cookies/sites`
- `GET /api/profiles/:idOrName/cookies?site=example.com`
- `POST /api/profiles/:idOrName/cookies`
- `POST /api/profiles/:idOrName/cookies/delete`
- `POST /api/profiles/:idOrName/cookies/clear`
- `GET /api/profiles/:idOrName/cookies/export?site=example.com`
- `POST /api/profiles/:idOrName/cookies/import` (`mode=merge|replace`)

References:

- Examples: `docs/API_COOKIE_EXAMPLES.md`
- Postman collection: `docs/postman/GeekEZ_Cookie_API.postman_collection.json`
- Postman env template: `docs/postman/GeekEZ_Local.postman_environment.json`
- Postman guide: `docs/postman/README.md`
- Smoke commands: `npm run smoke:cookie-api`, `npm run smoke:cookie-api:newman`

## Subscription URL Safety Policy

By default, subscription fetch blocks `localhost` and private-network targets, and validates redirect chains.

If you need internal subscription sources, configure explicit allowlist entries in:

- Settings -> Developer Features -> `subscriptionPrivateAllowlist`
- Examples: `127.0.0.1`, `*.localhost`, `intranet.example.com`

## Quick Start

### Option 1: Download Release (Recommended)

Download installers from [Releases](https://github.com/EchoHS/GeekezBrowser/releases):

- Windows: `GeekEZ Browser-{version}-win-x64.exe`
- macOS ARM64: `GeekEZ Browser-{version}-mac-arm64.dmg`
- macOS Intel: `GeekEZ Browser-{version}-mac-x64.dmg`
- Linux: `GeekEZ Browser-{version}-linux-x64.AppImage`

### Option 2: Run from Source

Prerequisites:

- Node.js (v16+)
- Git

```bash
git clone https://github.com/EchoHS/GeekezBrowser.git
cd GeekezBrowser
npm install
npm start
```

## Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## Regression (No GUI)

```bash
npm run regression:ipc
npm run regression:i18n
npm run regression:all
```

## Compatibility Notes

The project emphasizes profile isolation + stable dedicated IP workflow. For high-risk platforms/accounts, use fixed environment parameters and avoid high-frequency automation patterns.

## FAQ

### macOS: "App is damaged" or "Cannot be opened"

1. Move `GeekEZ Browser` to **Applications**.
2. Run:

```bash
sudo xattr -rd com.apple.quarantine /Applications/GeekEZ\ Browser.app
```

3. Re-open the app.

## Important Notes

1. For sensitive websites, prefer timezone auto-match mode.
2. Keep geolocation aligned with proxy exit location.
3. Enable remote debugging only when external automation is required.

## Disclaimer

This project is provided for educational and research purposes only. Users are responsible for complying with platform terms and applicable laws.

## License

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

## Community

- QQ Group: `1079216892`
