# SubtitleMe — RC Integrity Report (`1.0.0-rc.3`, Sprint 15.5)

- **Artifact**: `dist/release/subtitleme-stremio-v1.0.0-rc.3.tar.gz`
- **Version**: `1.0.0-rc.3`
- **Expected SHA-256**: `c1ab3cc45a6911226ab126bd04abeab137d9dbad06ebd0fcb3e61f53e896290d`
- **Actual SHA-256**: `c1ab3cc45a6911226ab126bd04abeab137d9dbad06ebd0fcb3e61f53e896290d`
- **Integrity Match**: **PASS (Exact Match)**
- **Archive Size**: `2,520,436` bytes
- **Extracted File Count**: `5,616` files
- **Isolated Extraction Path**: `%TEMP%\subtitleme-rc3-visual-validation` (outside monorepo; original RC preserved untouched)
- **Windows Extraction Note**: 4 POSIX symlinks in `node_modules/.bin/` (`mime`, `semver`, `addon-bootstrap`, `mkdirp`) emitted non-fatal `tar.exe` warnings on unprivileged Windows; all runtime modules (`dist/index.mjs`, `bin/*`, `node_modules/stremio-addon-sdk`) extracted cleanly.
