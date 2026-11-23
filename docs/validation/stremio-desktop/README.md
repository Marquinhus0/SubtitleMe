# Stremio Desktop External Validation Evidence Kit

Store **real, unedited** screenshots and filled execution results from a graphical Desktop host here.

## Directory Convention

```text
docs/validation/stremio-desktop/
├── README.md
├── results-template.json        # Copy to results-<os>-<date>.json when executing
└── screenshots/                 # Place real screenshots here (scenario-01.png .. scenario-15.png)
```

## Rules

- Do **not** commit synthetic or mocked screenshots representing the Stremio player.
- Only change a scenario status from `"Pending Human Check"` to `"Tested"` after real visual verification in Stremio Desktop.
- Attach OS, Stremio version, Node.js version, and addon version (`1.0.0-rc.1`) in the results file.
