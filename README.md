# Receipt Audit

Local-first receipt capture, line-item pre-audit and QuickBooks-ready export for small trade and fleet businesses.
Runs entirely in the browser (Chrome / Edge). No server, no account, nothing uploaded.

## Layout

| Path | What it is |
|---|---|
| `releases/` | Built, single-file apps: `receipt_audit_v2.1-industry.html`, `-legora.html`, `-poolside.html` (same app, three looks). Open one in Chrome or Edge. |
| `legacy/` | The original v1 and v2 single-file apps. The v2 file is the base the current generator patches. |
| `tools/legacy-gen/` | The generator that builds the v2.1 releases from `legacy/…_v2.html` plus the JS/CSS/HTML fragments in this folder. Run `python tools/legacy-gen/build_working.py`; it rewrites `releases/` and must leave `git diff` empty unless you changed a fragment. |
| `tools/design-mockups/` | Generator for the 13 static design-system mockups (not part of the product). |
| `app/` | The new TypeScript core (pure logic with a test suite). See `app/README.md`. |

## Product direction

Pre-accounting audit pipeline first (capture, line items, cost-code validation, clean exports), then an operations front end
that hands QuickBooks only summary batches, then operator dashboards.
