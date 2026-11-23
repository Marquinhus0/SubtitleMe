# ADR-001: Adopt Official `stremio-addon-sdk` with `getRouter()` over Custom Node HTTP Server

- **Status**: Accepted (Sprint 09)
- **Context**: The Stremio Addon Protocol defines REST-like endpoints (`/manifest.json`, `/:config/manifest.json`, `/subtitles/:type/:id.json`, `/configure`) with specific CORS, config-URL decoding, and manifest linting rules. SubtitleMe also needs custom HTTP routes (`/generated/:token.vtt` and `/health`) to deliver dynamically merged WebVTT files.
- **Decision**: Use the official `stremio-addon-sdk` (`v1.6.10`) via `addonBuilder` + `getRouter(addonInterface)`, mounted inside Node's built-in `http.createServer()` alongside custom `/generated/:token.vtt` and `/health` route handlers. Provide strict local TypeScript declarations in `src/types/stremio-addon-sdk.d.ts`.
- **Alternatives Discarded**:
  - *Manual protocol reimplementation*: Unnecessary maintenance burden and risk of drifting from official Stremio manifest/config URL parsing rules.
  - *SDK `serveHTTP()` standalone*: Does not cleanly expose custom `/generated/:token.vtt` routes without wrapping or running a second HTTP port.
- **Consequences**: Full official protocol compatibility, automatic `/configure` landing page support, and zero extra web framework dependencies beyond what `stremio-addon-sdk` already provides.
