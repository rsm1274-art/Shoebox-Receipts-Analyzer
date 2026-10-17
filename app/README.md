# Receipt Audit core (TypeScript)

Pure, DOM-free logic extracted from the single-file app: categorizing receipt lines, tax/tip splits, audit flags, OCR parsing
and the QuickBooks export builders. No globals: everything the rules need is passed in a `CoreContext`.

```
src/core/
  types.ts       Receipt, LineItem, Split, Anomaly, CoreContext ...
  defaults.ts    built-in chart of accounts, payment accounts, fleet classes, thresholds
  categorize.ts  getActiveCategories, inferLineItemCategory, mapPaymentMethodToAccount
  splits.ts      computeProRataSplits (pro-rata tax/tip + penny plug)
  audit.ts       auditAndCategorizeReceipt (pure), extractFuelMetadata
  parse.ts       parseRawOcrTextToReceipt
  exports.ts     bank-feed CSV, split CSV, .QBO builders, memo, date/CSV helpers
tests/
  core/behavior.test.ts   readable examples of the rules the Help manual describes
  core/golden.test.ts     TypeScript core must equal what the shipped app produced on a seeded corpus
  oracle/                 harness that runs a release in a VM; also checks the released apps reproduce the golden data
  oracle/wired.test.ts    the apps in releases/ (rules delegating to the core) must equal the pre-extraction outputs
  golden/core.json        the recorded legacy outputs (about 1,600 cases, 6 context variants)
scripts/
  bundle-core.mjs         esbuild: src/core -> one IIFE exposing the global ReceiptCore
  wire-core.mjs           swaps the app's rule functions for thin adapters over ReceiptCore (acorn-based)
  build-releases.mjs      bundle + python generator + wire
```

## Commands

```
npm install
npm test                 # unit + golden-master + parity + released-app checks
npm run typecheck
npm run bundle:core      # compile src/core -> ../tools/legacy-gen/receipt-core.iife.js (committed)
npm run build:releases   # bundle, regenerate the three apps, wire them to the core
npm run golden:capture   # regenerate tests/golden/core.json from the frozen legacy app (rarely needed)
```

## Rules of the road

- The golden file is the contract. A change that alters it must be deliberate: update the code, regenerate the golden data
  from a deliberately changed oracle, and update the Help manual (`tools/legacy-gen/help.html`) in the same commit.
- `tests/oracle/fixtures/receipt_audit_v2.1-industry.legacy.html` is the app exactly as it shipped before extraction.
  Never rebuild it from the generator.
- Known quirks kept on purpose for parity are noted in the tests (for example the exact-5-cent boundary is decided by
  floating-point rounding).
