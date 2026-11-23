# SubtitleMe

> **Two languages. One experience.**

SubtitleMe is a modern, privacy-first dual-subtitle browser extension (Chrome Manifest V3) that displays two independent subtitle tracks simultaneously on compatible HTML5 video players, supporting both exposed native tracks and locally imported `.srt` / `.vtt` files.

## Features (v1.0 Roadmap)

- Simultaneous dual-subtitle rendering via an isolated Shadow DOM overlay
- Independent language selection, appearance customization, and timing offsets per track
- Local `.srt` and `.vtt` file import with IndexedDB persistence (100% local — never uploaded)
- HTML5 video player adapter architecture designed for future Chromium browsers and Stremio Addon reuse
- Modern Dark UI in English (`en`) and Portuguese — Brazil (`pt-BR`)
- Zero backend, zero accounts, zero telemetry

## Monorepo Structure

```text
apps/
  chrome-extension/    # Chrome Manifest V3 extension (Vue 3 + Pinia + Tailwind CSS + Vite)
packages/
  shared-types/        # Shared TypeScript domain models, settings, and message contracts
  subtitle-parser/     # Browser-independent SRT and WebVTT parser
  subtitle-core/       # Track management, binary-search lookup, and subtitle merger
  subtitle-sync/       # Playback synchronization engine (requestAnimationFrame)
  subtitle-renderer/   # Shadow DOM dual-subtitle overlay renderer
  subtitle-storage/    # Chrome Storage settings & IndexedDB local subtitle persistence
tests/
  fixtures/            # Legally available media and subtitle fixtures
  unit/                # Vitest unit tests
  integration/         # Integration tests
  e2e/                 # Playwright end-to-end tests
docs/                  # Architecture, requirements, security, testing, roadmap, compatibility
```

## Development

Prerequisites: **Node.js >= 22** and **pnpm >= 10**.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm package:release  # Generates reproducible dist/release/subtitleme-chrome-v1.0.0.zip + SHA256SUMS.txt
pnpm test:release     # Extracts ZIP and runs full E2E suite in real Chromium
```

To load the unpacked extension in Google Chrome, see the step-by-step [Installation Guide](docs/INSTALLATION.md).

## Version Bump Process

When releasing a new version (`X.Y.Z`), update the version identically in:
1. `package.json`
2. `apps/chrome-extension/package.json`
3. `apps/chrome-extension/public/manifest.json`
4. `docs/CHANGELOG.md` and `docs/RELEASE_NOTES.md`

Then run `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm package:release && pnpm test:release` (`package-release.mjs` automatically enforces version parity across all three JSON files).

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Release Notes (v1.0.0)](docs/RELEASE_NOTES.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
- [Chrome Web Store Listing](docs/STORE_LISTING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Requirements](docs/REQUIREMENTS.md)
- [Security & Privacy](docs/SECURITY.md) · [Security Audit](docs/SECURITY_AUDIT.md)
- [Accessibility Audit](docs/ACCESSIBILITY_AUDIT.md) · [Performance Audit](docs/PERFORMANCE_AUDIT.md)
- [Testing Strategy](docs/TESTING.md)
- [Compatibility Matrix](docs/COMPATIBILITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Changelog](docs/CHANGELOG.md)
