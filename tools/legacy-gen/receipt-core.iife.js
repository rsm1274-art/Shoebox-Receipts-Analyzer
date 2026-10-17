/* GENERATED from app/src/core by app/scripts/bundle-core.mjs - do not edit */
"use strict";
var ReceiptCore = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/core/index.ts
  var index_exports = {};
  __export(index_exports, {
    CAPEX_LINE_THRESHOLD: () => CAPEX_LINE_THRESHOLD,
    CAPEX_THRESHOLD: () => CAPEX_THRESHOLD,
    ChangeTracker: () => ChangeTracker,
    DEFAULT_COA_ACCOUNTS: () => DEFAULT_COA_ACCOUNTS,
    DEFAULT_FLEET_CLASSES: () => DEFAULT_FLEET_CLASSES,
    DEFAULT_LINE_CATEGORY: () => DEFAULT_LINE_CATEGORY,
    DEFAULT_PAYMENT_ACCOUNTS: () => DEFAULT_PAYMENT_ACCOUNTS,
    EXCESSIVE_TIP_PCT: () => EXCESSIVE_TIP_PCT,
    FIXED_ASSET_ACCOUNT_ID: () => FIXED_ASSET_ACCOUNT_ID,
    FIXED_ASSET_FALLBACK_NAME: () => FIXED_ASSET_FALLBACK_NAME,
    GENESIS_HASH: () => GENESIS_HASH,
    MATH_TOLERANCE: () => MATH_TOLERANCE,
    MIN_WAIVER_NOTE_LENGTH: () => MIN_WAIVER_NOTE_LENGTH,
    PAYMENT_MATCH_DEFAULTS: () => PAYMENT_MATCH_DEFAULTS,
    SESSION_SCHEMA: () => SESSION_SCHEMA,
    STATUSES: () => STATUSES,
    TRACKED_LINE_FIELDS: () => TRACKED_LINE_FIELDS,
    TRACKED_RECEIPT_FIELDS: () => TRACKED_RECEIPT_FIELDS,
    acceptFlag: () => acceptFlag,
    appendLogEntries: () => appendLogEntries,
    appendLogEntry: () => appendLogEntry,
    applyWorkflowEffects: () => applyWorkflowEffects,
    approvalBlockers: () => approvalBlockers,
    auditAndCategorizeReceipt: () => auditAndCategorizeReceipt,
    bankFeedFileName: () => bankFeedFileName,
    buildBankFeedCsv: () => buildBankFeedCsv,
    buildQboBankMemo: () => buildQboBankMemo,
    buildQboWebConnect: () => buildQboWebConnect,
    buildSplitCsv: () => buildSplitCsv,
    computeProRataSplits: () => computeProRataSplits,
    correctionRevision: () => correctionRevision,
    createBatch: () => createBatch,
    defaultContext: () => defaultContext,
    defaultFleetClass: () => defaultFleetClass,
    escapeCsvCell: () => escapeCsvCell,
    exportableReceipts: () => exportableReceipts,
    extractFuelMetadata: () => extractFuelMetadata,
    flagKey: () => flagKey,
    formatDateForQBO: () => formatDateForQBO,
    getActiveCategories: () => getActiveCategories,
    hasUnresolvedHighFlag: () => hasUnresolvedHighFlag,
    hashEntry: () => hashEntry,
    inferLineItemCategory: () => inferLineItemCategory,
    initialStatus: () => initialStatus,
    isFlagResolved: () => isFlagResolved,
    isIsoDate: () => isIsoDate,
    mapPaymentMethodToAccount: () => mapPaymentMethodToAccount,
    migrateSession: () => migrateSession,
    nextBatchId: () => nextBatchId,
    parseRawOcrTextToReceipt: () => parseRawOcrTextToReceipt,
    qboFitId: () => qboFitId,
    reopenReceipt: () => reopenReceipt,
    sha256Hex: () => sha256Hex,
    splitCsvFileName: () => splitCsvFileName,
    stableStringify: () => stableStringify,
    statusAfterEdit: () => statusAfterEdit,
    transition: () => transition,
    verifyLog: () => verifyLog,
    waiverFor: () => waiverFor,
    webConnectFileName: () => webConnectFileName
  });

  // src/core/defaults.ts
  var DEFAULT_COA_ACCOUNTS = [
    // Tier 1: core fleet operating accounts (permanent)
    {
      id: "veh_fuel",
      name: "Vehicle: Fuel & DEF",
      tier: "operating",
      archived: false,
      keywords: ["fuel", "diesel", "unleaded", "gasoline", "def ", "blue def", "gallon", "shell", "chevron", "exxon", "pilot", "loves"]
    },
    {
      id: "veh_maint",
      name: "Vehicle: Repairs & Maintenance",
      tier: "operating",
      archived: false,
      keywords: ["oil change", "tire", "brake", "car wash", "wiper", "alignment", "filter", "mechanic", "service", "wash"]
    },
    {
      id: "veh_tolls",
      name: "Vehicle: Parking, Tolls & Citations",
      tier: "operating",
      archived: false,
      keywords: ["toll", "ezpass", "turnpike", "parking", "meter", "garage", "bridge"]
    },
    {
      id: "op_supplies",
      name: "Operating Supplies & Moving Gear",
      tier: "operating",
      archived: false,
      keywords: ["ratchet", "strap", "blanket", "dolly", "shrink wrap", "tape", "gloves", "ppe", "bungee", "tarp", "moving"]
    },
    {
      id: "meals_perdiem",
      name: "Meals (50% Limit) & Driver Per Diem",
      tier: "operating",
      archived: false,
      keywords: ["bistro", "cafe", "coffee", "grill", "burger", "pizza", "salmon", "fries", "flatbread", "dinner", "lunch", "water", "platter"]
    },
    {
      id: "office_dispatch",
      name: "Office & Dispatch Software",
      tier: "operating",
      archived: false,
      keywords: ["toner", "paper", "usb", "hub", "clipboard", "mount", "charger", "cable", "dispatch", "eld"]
    },
    {
      id: "owners_draw",
      name: "Owner's Draw / Personal (Non-Reimbursable)",
      tier: "operating",
      archived: false,
      keywords: ["gift card", "playstation", "xbox", "cabernet", "wine", "beer", "bourbon", "personal", "lottery"]
    },
    // Tier 2: CapEx, upfitting and launch accounts (toggleable / archivable)
    {
      id: "startup_upfit",
      name: "CapEx: Fleet Upfitting & Shelving",
      tier: "startup",
      archived: false,
      keywords: ["e-track", "etrack", "shelving", "bulkhead", "partition", "roof rack", "cargo light", "upfit", "floor mat"]
    },
    {
      id: "startup_dot",
      name: "CapEx: Licensing, Permits & DOT",
      tier: "startup",
      archived: false,
      keywords: ["usdot", "mc number", "llc", "permit", "registration", "inspection fee", "filing", "authority"]
    },
    {
      id: "startup_brand",
      name: "CapEx: Branding & Signage",
      tier: "startup",
      archived: false,
      keywords: ["decal", "vinyl wrap", "magnet", "lettering", "logo", "uniform", "signage"]
    },
    {
      id: "fixed_assets",
      name: "Fixed Assets: Equipment & Tools (> $2,500)",
      tier: "startup",
      archived: false,
      keywords: ["liftgate", "hydraulic", "pallet jack", "forklift", "hoist", "generator"]
    },
    {
      id: "startup_preopen",
      name: "CapEx: Pre-Opening Supplies",
      tier: "startup",
      archived: false,
      keywords: ["initial stock", "starter kit", "launch kit", "lockbox"]
    }
  ];
  var PAYMENT_NAMES = [
    "Chase Ink Business Visa (*4921)",
    "Amex Plum Fleet Card (*1004)",
    "Relay Business Checking (*8832)",
    "Founder Personal Card (Due to Owner / Reimbursable)",
    "Petty Cash / Driver Cash"
  ];
  var PAYMENT_MATCH_DEFAULTS = [["4921"], ["1004", "amex"], ["8832", "mastercard"], ["personal", "0091"], ["cash"]];
  var DEFAULT_PAYMENT_ACCOUNTS = PAYMENT_NAMES.map((name, i) => ({
    name,
    archived: false,
    match: PAYMENT_MATCH_DEFAULTS[i] || []
  }));
  var DEFAULT_FLEET_CLASSES = [
    "Van #1 - Ford Transit 250",
    "Van #2 - Mercedes Sprinter",
    "Van #3 - RAM ProMaster",
    "General Fleet / Shared Ops",
    "CapEx / Launch Phase (Unassigned)"
  ].map((name) => ({ name, archived: false }));
  function defaultContext() {
    return {
      coaAccounts: structuredClone(DEFAULT_COA_ACCOUNTS),
      startupPhaseMode: true,
      paymentAccounts: structuredClone(DEFAULT_PAYMENT_ACCOUNTS),
      fleetClasses: structuredClone(DEFAULT_FLEET_CLASSES)
    };
  }
  var CAPEX_LINE_THRESHOLD = 2500;
  var FIXED_ASSET_ACCOUNT_ID = "fixed_assets";
  var FIXED_ASSET_FALLBACK_NAME = "Fixed Assets: Equipment & Tools (> $2,500)";
  var DEFAULT_LINE_CATEGORY = "Operating Supplies & Moving Gear";

  // src/core/categorize.ts
  function getActiveCategories(ctx) {
    return ctx.coaAccounts.filter((c) => {
      if (c.archived) return false;
      if (!ctx.startupPhaseMode && c.tier === "startup") return false;
      return true;
    });
  }
  function inferLineItemCategory(item, ctx) {
    if (item.manualCategory) return item.category;
    const lowerName = (item.name || "").toLowerCase();
    const price = Number(item.price || 0) * Number(item.qty || 1);
    if (price >= CAPEX_LINE_THRESHOLD) {
      return (ctx.coaAccounts.find((c) => c.id === FIXED_ASSET_ACCOUNT_ID) || { name: FIXED_ASSET_FALLBACK_NAME }).name;
    }
    for (const acc of getActiveCategories(ctx)) {
      if ((acc.keywords || []).some((kw) => lowerName.includes(kw.toLowerCase()))) {
        return acc.name;
      }
    }
    return item.category || DEFAULT_LINE_CATEGORY;
  }
  function mapPaymentMethodToAccount(paymentStr, ctx) {
    const upper = String(paymentStr ?? "").toUpperCase();
    const active = ctx.paymentAccounts.filter((a) => !a.archived);
    for (const a of active) {
      if ((a.match || []).some((m) => m && upper.includes(String(m).toUpperCase()))) return a.name;
    }
    return (active[0] || ctx.paymentAccounts[0] || { name: "Chase Ink Business Visa (*4921)" }).name;
  }
  function defaultFleetClass(ctx) {
    return (ctx.fleetClasses.find((c) => !c.archived) || ctx.fleetClasses[0] || { name: "Van #1 - Ford Transit 250" }).name;
  }

  // src/core/splits.ts
  function computeProRataSplits(receipt) {
    const items = receipt.items || [];
    const computedSub = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);
    const taxAndTip = Number(receipt.tax || 0) + Number(receipt.tip || 0);
    const targetGrandTotal = Number(receipt.total || computedSub + taxAndTip);
    const groups = /* @__PURE__ */ new Map();
    items.forEach((item) => {
      const cat = item.category || DEFAULT_LINE_CATEGORY;
      const itemTotal = (Number(item.price) || 0) * (Number(item.qty) || 1);
      let g = groups.get(cat);
      if (!g) {
        g = { category: cat, rawSubtotal: 0, allocatedTaxTip: 0, qboSplitAmount: 0, itemNames: [] };
        groups.set(cat, g);
      }
      g.rawSubtotal += itemTotal;
      g.itemNames.push(item.name);
    });
    const splits = [...groups.values()];
    let runningSum = 0;
    splits.forEach((sp, idx) => {
      const ratio = computedSub > 0 ? sp.rawSubtotal / computedSub : 1 / Math.max(splits.length, 1);
      sp.allocatedTaxTip = taxAndTip * ratio;
      if (idx === splits.length - 1 && Math.abs(computedSub + taxAndTip - targetGrandTotal) < 0.05) {
        sp.qboSplitAmount = Number((targetGrandTotal - runningSum).toFixed(2));
      } else {
        sp.qboSplitAmount = Number((sp.rawSubtotal + sp.allocatedTaxTip).toFixed(2));
        runningSum += sp.qboSplitAmount;
      }
    });
    return splits;
  }

  // src/core/audit.ts
  var CAPEX_THRESHOLD = 2500;
  var MATH_TOLERANCE = 0.05;
  var EXCESSIVE_TIP_PCT = 20.5;
  function extractFuelMetadata(receipt) {
    const combinedText = [
      receipt.rawOcrText || "",
      receipt.extraNote || "",
      ...(receipt.items || []).map((i) => i.name)
    ].join(" ");
    const galMatch = combinedText.match(/(\d+\.\d{1,3})\s*GAL(?:LONS?)?(?:\s*@\s*\$?(\d+\.\d{2,3}))?/i);
    if (galMatch) {
      const gallons = parseFloat(galMatch[1]).toFixed(2);
      const pricePerGal = galMatch[2] ? `$${parseFloat(galMatch[2]).toFixed(2)}/gal` : "";
      return pricePerGal ? `${gallons} gal @ ${pricePerGal}` : `${gallons} gal pumped`;
    }
    return null;
  }
  function auditAndCategorizeReceipt(input, ctx) {
    const receipt = { ...input };
    const anomalies = [];
    if (!receipt.paidFromAccount) {
      receipt.paidFromAccount = mapPaymentMethodToAccount(receipt.paymentMethod || "", ctx);
    }
    if (!receipt.vanClass) {
      receipt.vanClass = defaultFleetClass(ctx);
    }
    const items = receipt.items || [];
    const computedSubtotal = items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
    const taxAndTip = Number(receipt.tax || 0) + Number(receipt.tip || 0);
    receipt.items = items.map((item) => {
      const lineBase = (Number(item.price) || 0) * (Number(item.qty) || 1);
      const matchedCat = inferLineItemCategory(item, ctx);
      const ratio = computedSubtotal > 0 ? lineBase / computedSubtotal : 0;
      const taxInclusiveAmount = lineBase + taxAndTip * ratio;
      const lowerName = (item.name || "").toLowerCase();
      if (matchedCat.includes("Owner's Draw") || (ctx.coaAccounts.find((c) => c.name === matchedCat) || { id: void 0 }).id === "owners_draw" || lowerName.includes("wine") || lowerName.includes("cabernet") || lowerName.includes("gift card")) {
        anomalies.push({
          severity: "high",
          code: "OWNER_DRAW_SPLIT",
          title: `Personal / Non-Deductible Item: "${item.name}"`,
          detail: `"${item.name}" ($${lineBase.toFixed(2)}) is routed to "Owner's Draw / Personal" so it doesn't pollute business operating deductions.`
        });
      }
      if (lineBase >= CAPEX_THRESHOLD) {
        anomalies.push({
          severity: "high",
          code: "CAPEX_THRESHOLD",
          title: `Fixed Asset / CapEx Threshold Alert ($${lineBase.toFixed(2)})`,
          detail: `"${item.name}" exceeds the $2,500 IRS De Minimis Safe Harbor threshold. Flagged under "Fixed Assets: Equipment & Tools" for Section 179 / Depreciation.`
        });
      }
      return { ...item, category: matchedCat, taxInclusiveAmount: Number(taxInclusiveAmount.toFixed(2)) };
    });
    const qboSplits = computeProRataSplits(receipt);
    receipt.qboSplits = qboSplits;
    let dominantCategory = DEFAULT_LINE_CATEGORY;
    let maxSplitVal = -1;
    let hasStartupCategory = false;
    qboSplits.forEach((sp) => {
      if (sp.qboSplitAmount > maxSplitVal) {
        maxSplitVal = sp.qboSplitAmount;
        dominantCategory = sp.category;
      }
      const coaObj = ctx.coaAccounts.find((c) => c.name === sp.category);
      if (coaObj && coaObj.tier === "startup" || sp.category.startsWith("CapEx") || sp.category.startsWith("Startup") || sp.category.startsWith("Fixed Assets")) {
        hasStartupCategory = true;
      }
    });
    receipt.category = dominantCategory;
    if (!receipt.expensePhase) {
      receipt.expensePhase = hasStartupCategory ? "CapEx (One-Off)" : "Operating (Recurring)";
    }
    if (qboSplits.length > 1) {
      const splitSummary = qboSplits.map((s) => `${s.category.split(":")[0]} ($${s.qboSplitAmount.toFixed(2)})`).join(" + ");
      anomalies.push({
        severity: "medium",
        code: "MIXED_RECEIPT_SPLIT",
        title: `Split Transaction Required (${qboSplits.length} QBO Accounts)`,
        detail: `Receipt spans multiple categories: ${splitSummary}. Tax & tip have been pro-rated across each split automatically.`
      });
    }
    const isFuelReceipt = qboSplits.some((s) => s.category.includes("Fuel") || (ctx.coaAccounts.find((c) => c.name === s.category) || { id: void 0 }).id === "veh_fuel");
    const fuelMeta = extractFuelMetadata(receipt);
    receipt.fuelMeta = fuelMeta;
    if (isFuelReceipt && !fuelMeta) {
      anomalies.push({
        severity: "low",
        code: "FUEL_GALLONS_CHECK",
        title: "Fuel Receipt Missing Gallons Metadata",
        detail: "Categorized under Vehicle: Fuel & DEF, but gallons pumped were not detected in OCR text for IFTA/fleet mileage tracking."
      });
    }
    const declaredSubtotal = Number(receipt.subtotal ?? computedSubtotal);
    if (receipt.items.length > 0 && Math.abs(computedSubtotal - declaredSubtotal) > MATH_TOLERANCE) {
      anomalies.push({
        severity: "high",
        code: "SUBTOTAL_MISMATCH",
        title: "Line Item Sum \u2260 Subtotal",
        detail: `Sum of line items is $${computedSubtotal.toFixed(2)}, but receipt subtotal states $${declaredSubtotal.toFixed(2)} (Diff: $${Math.abs(computedSubtotal - declaredSubtotal).toFixed(2)}).`
      });
    }
    const tax = Number(receipt.tax || 0);
    const tip = Number(receipt.tip || 0);
    const declaredTotal = Number(receipt.total || 0);
    const expectedTotal = declaredSubtotal + tax + tip;
    if (Math.abs(expectedTotal - declaredTotal) > MATH_TOLERANCE) {
      anomalies.push({
        severity: "high",
        code: "TOTAL_MATH_ERROR",
        title: `Receipt Total Math Discrepancy ($${Math.abs(expectedTotal - declaredTotal).toFixed(2)})`,
        detail: `Subtotal ($${declaredSubtotal.toFixed(2)}) + Tax ($${tax.toFixed(2)}) + Tip ($${tip.toFixed(2)}) = $${expectedTotal.toFixed(2)}, but printed Total is $${declaredTotal.toFixed(2)}.`
      });
    }
    if (declaredSubtotal > 0 && tip > 0) {
      const tipPct = tip / declaredSubtotal * 100;
      if (tipPct > EXCESSIVE_TIP_PCT) {
        anomalies.push({
          severity: "medium",
          code: "EXCESSIVE_TIP",
          title: `High Gratuity Flag (${tipPct.toFixed(1)}%)`,
          detail: `Tip of $${tip.toFixed(2)} on $${declaredSubtotal.toFixed(2)} subtotal is ${tipPct.toFixed(1)}%, exceeding 20% fleet meal policy.`
        });
      }
    }
    const seenItems = /* @__PURE__ */ new Map();
    receipt.items.forEach((item) => {
      const key = `${(item.name || "").toLowerCase().trim()}_${Number(item.price).toFixed(2)}`;
      seenItems.set(key, (seenItems.get(key) || 0) + 1);
    });
    for (const [key, count] of seenItems) {
      if (count > 1) {
        const [dupName, dupPrice] = key.split("_");
        anomalies.push({
          severity: "medium",
          code: "DUPLICATE_ITEM",
          title: `Double-Scanned Item (${count}x)`,
          detail: `"${dupName.toUpperCase()}" at $${dupPrice} appears ${count} times on this receipt.`
        });
      }
    }
    receipt.anomalies = anomalies;
    receipt.computedSubtotal = computedSubtotal;
    receipt.expectedTotal = expectedTotal;
    return receipt;
  }

  // src/core/parse.ts
  function parseRawOcrTextToReceipt(rawText, ctx, fallbackFileName = "Uploaded Receipt", today = /* @__PURE__ */ new Date()) {
    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    let merchant = fallbackFileName.replace(/\.[^/.]+$/, "");
    let date = today.toISOString().slice(0, 10);
    let paymentMethod = "VISA *4921";
    const items = [];
    let subtotal = null;
    let tax = 0;
    let tip = 0;
    let total = null;
    for (const line of lines.slice(0, 4)) {
      if (line.length > 3 && !line.includes("DATE:") && !/^\d+$/.test(line)) {
        merchant = line.replace(/[^a-zA-Z0-9 &'-]/g, "").trim();
        break;
      }
    }
    const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})/);
    if (dateMatch) date = dateMatch[0];
    const payMatch = rawText.match(/(VISA|AMEX|MASTERCARD|DISCOVER|DEBIT|CASH)\s*(?:\*+\d{4})?/i);
    if (payMatch) paymentMethod = payMatch[0].toUpperCase();
    const priceLineRegex = /^(.+?)\s+\$?(\d+\.\d{2})$/;
    lines.forEach((line) => {
      const cleanLine = line.replace(/[|]/g, "").trim();
      const match = cleanLine.match(priceLineRegex);
      if (match) {
        const label = match[1].replace(/^[-\d\s*]+/, "").trim();
        const amount = parseFloat(match[2]);
        const upperLabel = label.toUpperCase();
        if (upperLabel.includes("SUBTOTAL") || upperLabel.includes("SUB TOTAL")) {
          subtotal = amount;
        } else if (upperLabel.includes("TAX") || upperLabel.includes("VAT")) {
          tax = amount;
        } else if (upperLabel.includes("TIP") || upperLabel.includes("GRATUITY")) {
          tip = amount;
        } else if (upperLabel.includes("TOTAL") || upperLabel.includes("AMOUNT DUE")) {
          total = amount;
        } else if (label.length >= 2 && !upperLabel.includes("CASH") && !upperLabel.includes("CHANGE")) {
          items.push({ name: label, qty: 1, price: amount });
        }
      }
    });
    const computedSub = items.reduce((s, i) => s + i.price, 0);
    const finalSubtotal = subtotal === null ? computedSub : subtotal;
    const finalTotal = total === null ? finalSubtotal + tax + tip : total;
    return {
      merchant: merchant || "Unidentified Merchant",
      date,
      paymentMethod,
      paidFromAccount: mapPaymentMethodToAccount(paymentMethod, ctx),
      items,
      subtotal: finalSubtotal,
      tax,
      tip,
      total: finalTotal,
      rawOcrText: rawText
    };
  }

  // src/core/exports.ts
  function formatDateForQBO(dateStr, emptyFallback = "10/16/2026") {
    if (!dateStr) return emptyFallback;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [yyyy, mm, dd] = dateStr.split("-");
      return `${mm}/${dd}/${yyyy}`;
    }
    return dateStr;
  }
  function escapeCsvCell(val) {
    const str = String(val ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  }
  function correctionRevision(receipt) {
    return Number(receipt.revision) || 0;
  }
  function qboFitId(receipt) {
    const rev = correctionRevision(receipt);
    return rev > 0 ? `${receipt.id}-r${rev}` : receipt.id;
  }
  function buildQboBankMemo(receipt) {
    const rev = correctionRevision(receipt);
    const correctionPrefix = rev > 0 ? `CORRECTION r${rev} | ` : "";
    const splits = receipt.qboSplits || [];
    const splitHint = splits.length > 1 ? `[SPLIT: ${splits.map((s) => `${s.category.split(":")[0]} $${s.qboSplitAmount.toFixed(2)}`).join(" / ")}]` : `[${receipt.category}]`;
    const vanShort = (receipt.vanClass || "General").split(" - ")[0];
    const fuelStr = receipt.fuelMeta ? ` | ${receipt.fuelMeta}` : "";
    const itemsSummary = (receipt.items || []).map((i) => i.name).slice(0, 3).join(", ");
    return `${correctionPrefix}${receipt.merchant} | ${splitHint} | ${vanShort}${fuelStr} | ${itemsSummary}`;
  }
  function exportableReceipts(receipts, excludeMathErrors) {
    if (!excludeMathErrors) return receipts;
    return receipts.filter((r) => !(r.anomalies || []).some((a) => a.code === "TOTAL_MATH_ERROR" || a.code === "SUBTOTAL_MISMATCH"));
  }
  var isoDay = (now) => now.toISOString().slice(0, 10);
  function buildBankFeedCsv(list) {
    const headers = ["Date", "Description", "Credit", "Debit"];
    const rows = list.map((r) => [
      formatDateForQBO(r.date),
      escapeCsvCell(buildQboBankMemo(r)),
      "",
      Number(r.total || 0).toFixed(2)
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
  var batchSuffix = (batchId) => batchId ? `_${batchId}` : "";
  var bankFeedFileName = (now, batchId) => `QBO_BankFeed_4Col_${isoDay(now)}${batchSuffix(batchId)}.csv`;
  function buildSplitCsv(list) {
    const headers = [
      "ReceiptRefID",
      "Date",
      "Vendor_Payee",
      "PaidFromAccount",
      "QBO_Category_Account",
      "Split_Amount_Inc_Tax",
      "Class_Van_ID",
      "CapEx_Flag",
      "Memo_Line_Items",
      "Audit_Flags"
    ];
    const rows = [];
    list.forEach((r) => {
      const auditFlags = (r.anomalies || []).map((a) => a.code).join("; ") || "CLEAN";
      (r.qboSplits || []).forEach((sp) => {
        const rev = correctionRevision(r);
        const correctionPrefix = rev > 0 ? `CORRECTION r${rev}: ` : "";
        const memo = correctionPrefix + sp.itemNames.join("; ") + (r.fuelMeta ? ` [${r.fuelMeta}]` : "");
        rows.push([
          escapeCsvCell(r.id),
          formatDateForQBO(r.date),
          escapeCsvCell(r.merchant),
          escapeCsvCell(r.paidFromAccount),
          escapeCsvCell(sp.category),
          Number(sp.qboSplitAmount).toFixed(2),
          escapeCsvCell(r.vanClass),
          escapeCsvCell(/CapEx|Startup/.test(r.expensePhase || "") ? "YES" : "NO"),
          escapeCsvCell(memo),
          escapeCsvCell(auditFlags)
        ]);
      });
    });
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
  var splitCsvFileName = (now, batchId) => `QBO_Detailed_Splits_${isoDay(now)}${batchSuffix(batchId)}.csv`;
  function buildQboWebConnect(list, now) {
    const nowStamp = now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const trnBlocks = list.map((r) => {
      const dtPosted = (r.date || "2026-10-16").replace(/-/g, "") + "120000";
      const cleanName = (r.merchant || "VENDOR").replace(/[<>&]/g, "").slice(0, 32);
      const cleanMemo = buildQboBankMemo(r).replace(/[<>&]/g, "").slice(0, 240);
      return `
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>${dtPosted}
<TRNAMT>-${Number(r.total || 0).toFixed(2)}
<FITID>${qboFitId(r)}
<NAME>${cleanName}
<MEMO>${cleanMemo}
</STMTTRN>`;
    }).join("\n");
    return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>${nowStamp}
<LANGUAGE>ENG
<INTU.BID>3000
</SONRS>
</SIGNONMSGSRSV1>
<CREDITCARDMSGSRSV1>
<CCSTMTTRNRS>
<TRNUID>1
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<CCSTMTRS>
<CURDEF>USD
<CCACCTFROM><ACCTID>RECEIPTAUDIT-FLEET-4921</CCACCTFROM>
<BANKTRANLIST>
<DTSTART>20260101000000
<DTEND>${nowStamp}
${trnBlocks}
</BANKTRANLIST>
</CCSTMTRS>
</CCSTMTTRNRS>
</CREDITCARDMSGSRSV1>
</OFX>`;
  }
  var webConnectFileName = (now, batchId) => `ReceiptAudit_${isoDay(now)}${batchSuffix(batchId)}.qbo`;

  // src/core/sha256.ts
  var K = new Uint32Array([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  function rotr(x, n) {
    return x >>> n | x << 32 - n;
  }
  function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const bitLength = bytes.length * 8;
    const paddedLength = bytes.length + 9 + 63 >> 6 << 6;
    const data = new Uint8Array(paddedLength);
    data.set(bytes);
    data[bytes.length] = 128;
    const view = new DataView(data.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 4294967296));
    view.setUint32(paddedLength - 4, bitLength >>> 0);
    const h = new Uint32Array([
      1779033703,
      3144134277,
      1013904242,
      2773480762,
      1359893119,
      2600822924,
      528734635,
      1541459225
    ]);
    const w = new Uint32Array(64);
    for (let off = 0; off < paddedLength; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3;
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
        w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = e & f ^ ~e & g;
        const t1 = hh + S1 + ch + K[i] + w[i] >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = a & b ^ a & c ^ b & c;
        const t2 = S0 + maj >>> 0;
        hh = g;
        g = f;
        f = e;
        e = d + t1 >>> 0;
        d = c;
        c = b;
        b = a;
        a = t1 + t2 >>> 0;
      }
      h[0] = h[0] + a >>> 0;
      h[1] = h[1] + b >>> 0;
      h[2] = h[2] + c >>> 0;
      h[3] = h[3] + d >>> 0;
      h[4] = h[4] + e >>> 0;
      h[5] = h[5] + f >>> 0;
      h[6] = h[6] + g >>> 0;
      h[7] = h[7] + hh >>> 0;
    }
    let hex = "";
    for (let i = 0; i < 8; i++) hex += h[i].toString(16).padStart(8, "0");
    return hex;
  }

  // src/core/auditlog.ts
  var GENESIS_HASH = "0".repeat(64);
  function stableStringify(value) {
    if (value === void 0) return "null";
    if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
    if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
    const obj = value;
    const keys = Object.keys(obj).filter((k) => obj[k] !== void 0).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  var nul = (v) => v === void 0 ? null : v;
  function hashEntry(e) {
    return sha256Hex(stableStringify([
      e.seq,
      e.at,
      e.actor,
      e.action,
      nul(e.receiptId),
      nul(e.batchId),
      nul(e.field),
      nul(e.line),
      nul(e.from),
      nul(e.to),
      nul(e.note),
      e.prev
    ]));
  }
  function appendLogEntry(log, draft2) {
    const last = log[log.length - 1];
    const seq = last ? last.seq + 1 : 1;
    const prev = last ? last.hash : GENESIS_HASH;
    const withoutHash = { ...draft2, seq, prev };
    return [...log, { ...withoutHash, hash: hashEntry(withoutHash) }];
  }
  function appendLogEntries(log, drafts) {
    return drafts.reduce((acc, d) => appendLogEntry(acc, d), [...log]);
  }
  function verifyLog(log) {
    let prev = GENESIS_HASH;
    for (let i = 0; i < log.length; i++) {
      const e = log[i];
      if (e.seq !== i + 1) return { ok: false, seq: e.seq, reason: `sequence should be ${i + 1}, found ${e.seq}` };
      if (e.prev !== prev) return { ok: false, seq: e.seq, reason: "previous hash does not match the entry before it" };
      if (hashEntry(e) !== e.hash) return { ok: false, seq: e.seq, reason: "entry contents do not match their hash" };
      prev = e.hash;
    }
    return { ok: true };
  }

  // src/core/workflow.ts
  var STATUSES = ["captured", "needs_review", "approved", "exported"];
  var MIN_WAIVER_NOTE_LENGTH = 3;
  var TRANSITIONS = {
    captured: { escalate: "needs_review", send_back: "needs_review", approve: "approved", edit: "captured" },
    needs_review: { escalate: "needs_review", send_back: "needs_review", approve: "approved", edit: "needs_review" },
    approved: { escalate: "needs_review", send_back: "needs_review", edit: "needs_review", export: "exported" },
    exported: { reopen: "needs_review" }
  };
  function transition(status, event) {
    return TRANSITIONS[status][event] ?? null;
  }
  function initialStatus(receipt) {
    return hasUnresolvedHighFlag(receipt) ? "needs_review" : "captured";
  }
  function statusAfterEdit(status) {
    return transition(status, "edit") ?? status;
  }
  function flagKey(anomaly) {
    return `${anomaly.code}|${anomaly.title}`;
  }
  function waiverFor(receipt, anomaly) {
    const key = flagKey(anomaly);
    return (receipt.waivers || []).find((w) => w.key === key);
  }
  function isFlagResolved(receipt, anomaly) {
    return anomaly.severity !== "high" || waiverFor(receipt, anomaly) !== void 0;
  }
  function hasUnresolvedHighFlag(receipt) {
    return (receipt.anomalies || []).some((a) => !isFlagResolved(receipt, a));
  }
  function acceptFlag(anomaly, note, by, at) {
    const trimmed = (note || "").trim();
    if (trimmed.length < MIN_WAIVER_NOTE_LENGTH) {
      return { ok: false, error: `Write a reason of at least ${MIN_WAIVER_NOTE_LENGTH} characters.` };
    }
    return { ok: true, waiver: { code: anomaly.code, key: flagKey(anomaly), note: trimmed, by, at } };
  }
  function isIsoDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  function approvalBlockers(receipt, ctx) {
    const blockers = [];
    if (!receipt.merchant || !receipt.merchant.trim()) blockers.push("Merchant is empty.");
    if (!isIsoDate(receipt.date)) blockers.push("Date is not a real YYYY-MM-DD date. Fix it with the date box.");
    if (!ctx.paymentAccounts.some((a) => a.name === receipt.paidFromAccount && !a.archived)) {
      blockers.push("Paid-from account is missing or archived.");
    }
    if (!ctx.fleetClasses.some((c) => c.name === receipt.vanClass && !c.archived)) {
      blockers.push("Van is missing or archived.");
    }
    if (!(Number(receipt.total) > 0)) blockers.push("Total must be greater than zero.");
    const items = receipt.items || [];
    if (items.length === 0) blockers.push("Receipt has no line items.");
    const active = getActiveCategories(ctx);
    items.forEach((item, i) => {
      if (!active.some((c) => c.name === item.category)) {
        blockers.push(`Line ${i + 1} ("${item.name}") is on an inactive or missing account.`);
      }
    });
    for (const a of receipt.anomalies || []) {
      if (!isFlagResolved(receipt, a)) blockers.push(`Unresolved High flag: ${a.title}`);
    }
    return blockers;
  }

  // src/core/tracker.ts
  var TRACKED_RECEIPT_FIELDS = [
    "merchant",
    "date",
    "paidFromAccount",
    "vanClass",
    "expensePhase",
    "subtotal",
    "tax",
    "tip",
    "total"
  ];
  var TRACKED_LINE_FIELDS = ["name", "qty", "price", "category", "manualCategory"];
  var norm = (v) => v === void 0 ? null : v;
  var same = (a, b) => a === b;
  var pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, norm(obj[k])]));
  var lineKey = (l) => `${l.name}|${l.qty}|${l.price}`;
  function snapshotOf(r) {
    return {
      fields: pick(r, TRACKED_RECEIPT_FIELDS),
      lines: (r.items || []).map((item) => pick(item, TRACKED_LINE_FIELDS))
    };
  }
  function draft(opts, action, receiptId, extra = {}) {
    return {
      at: opts.at,
      actor: opts.actor,
      action,
      receiptId,
      batchId: null,
      field: null,
      line: null,
      from: null,
      to: null,
      note: null,
      ...extra
    };
  }
  function findRemovalIndex(longer, shorter) {
    for (const key of [lineKey, (l) => String(l.name)]) {
      const target = shorter.map(key).join("\n");
      for (let j = 0; j < longer.length; j++) {
        const without = longer.filter((_, i) => i !== j).map(key).join("\n");
        if (without === target) return j;
      }
    }
    return -1;
  }
  function diffLineFields(receiptId, prev, next, line, opts) {
    const out = [];
    for (const f of TRACKED_LINE_FIELDS) {
      if (same(prev[f], next[f])) continue;
      const note = f === "category" ? next.manualCategory ? "manual" : "auto" : null;
      out.push(draft(opts, "field.changed", receiptId, { field: f, line, from: prev[f], to: next[f], note }));
    }
    return out;
  }
  function diffReceipt(receiptId, prev, next, opts) {
    const out = [];
    for (const f of TRACKED_RECEIPT_FIELDS) {
      if (!same(prev.fields[f], next.fields[f])) {
        out.push(draft(opts, "field.changed", receiptId, { field: f, from: prev.fields[f], to: next.fields[f] }));
      }
    }
    const a = prev.lines;
    const b = next.lines;
    if (a.length === b.length) {
      a.forEach((line, i) => out.push(...diffLineFields(receiptId, line, b[i], i + 1, opts)));
      return out;
    }
    if (Math.abs(a.length - b.length) === 1) {
      const added = b.length > a.length;
      const j = added ? findRemovalIndex(b, a) : findRemovalIndex(a, b);
      if (j >= 0) {
        const changed = added ? b[j] : a[j];
        out.push(draft(opts, added ? "item.added" : "item.deleted", receiptId, {
          line: j + 1,
          [added ? "to" : "from"]: changed.name
        }));
        const keptPrev = added ? a : a.filter((_, i) => i !== j);
        const keptNext = added ? b.filter((_, i) => i !== j) : b;
        keptPrev.forEach((line, k) => {
          const lineNo = added ? k < j ? k + 1 : k + 2 : k + 1;
          out.push(...diffLineFields(receiptId, line, keptNext[k], lineNo, opts));
        });
        return out;
      }
    }
    const extra = Math.abs(a.length - b.length);
    for (let i = 0; i < extra; i++) {
      out.push(draft(opts, a.length < b.length ? "item.added" : "item.deleted", receiptId));
    }
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) out.push(...diffLineFields(receiptId, a[i], b[i], i + 1, opts));
    return out;
  }
  var ChangeTracker = class {
    constructor() {
      __publicField(this, "snaps", /* @__PURE__ */ new Map());
    }
    /** Starts tracking without logging anything. Call after load and migration, so restore never logs "created". */
    seed(receipts) {
      this.snaps = new Map(receipts.map((r) => [r.id, snapshotOf(r)]));
    }
    /** Log drafts for everything that changed since the last sync. A no-op sync returns []. */
    sync(receipts, opts) {
      const drafts = [];
      const seen = /* @__PURE__ */ new Set();
      for (const r of receipts) {
        seen.add(r.id);
        const next = snapshotOf(r);
        const prev = this.snaps.get(r.id);
        if (!prev) {
          drafts.push(draft(opts, "receipt.created", r.id, { note: opts.source ?? null }));
        } else {
          drafts.push(...diffReceipt(r.id, prev, next, opts));
        }
        this.snaps.set(r.id, next);
      }
      for (const id of [...this.snaps.keys()]) {
        if (!seen.has(id)) {
          drafts.push(draft(opts, "receipt.deleted", id, { note: opts.reason ?? null }));
          this.snaps.delete(id);
        }
      }
      return drafts;
    }
  };
  var EDIT_ACTIONS = /* @__PURE__ */ new Set(["field.changed", "item.added", "item.deleted"]);
  function applyWorkflowEffects(receipts, drafts, opts) {
    const createdIds = new Set(drafts.filter((d) => d.action === "receipt.created").map((d) => d.receiptId));
    const editedIds = new Set(drafts.filter((d) => EDIT_ACTIONS.has(d.action)).map((d) => d.receiptId));
    const extra = [];
    const updated = receipts.map((r) => {
      if (!r.status && !createdIds.has(r.id)) return r;
      if (createdIds.has(r.id)) {
        return { ...r, status: initialStatus(r), statusAt: opts.at, statusBy: opts.actor };
      }
      const from = r.status;
      if (from === "captured" && hasUnresolvedHighFlag(r)) {
        extra.push(statusDraft(opts, r.id, from, "needs_review", "auto escalation: unresolved High flag"));
        return { ...r, status: "needs_review", statusAt: opts.at, statusBy: opts.actor };
      }
      if (editedIds.has(r.id)) {
        const to = statusAfterEdit(from);
        if (to !== from) {
          extra.push(statusDraft(opts, r.id, from, to, "edited after approval"));
          return { ...r, status: to, statusAt: opts.at, statusBy: opts.actor };
        }
      }
      return r;
    });
    return { receipts: updated, drafts: [...drafts, ...extra] };
  }
  function statusDraft(opts, receiptId, from, to, note) {
    return {
      at: opts.at,
      actor: opts.actor,
      action: "status.changed",
      receiptId,
      batchId: null,
      field: "status",
      line: null,
      from,
      to,
      note
    };
  }

  // src/core/batches.ts
  var isoDay2 = (now) => now.toISOString().slice(0, 10);
  function nextBatchId(batches, now) {
    const prefix = `B-${isoDay2(now).replace(/-/g, "")}-`;
    const n = batches.filter((b) => b.id.startsWith(prefix)).length + 1;
    return `${prefix}${n}`;
  }
  function batchSnapshot(r) {
    const { imageUrl: _image, thumbUrl: _thumb, ...rest } = r;
    return JSON.parse(JSON.stringify(rest));
  }
  function createBatch(receipts, batches, actor, now) {
    const approved = receipts.filter((r) => r.status === "approved");
    if (approved.length === 0) return { ok: false, error: "No approved receipts to export." };
    const at = now.toISOString();
    const id = nextBatchId(batches, now);
    const locked = /* @__PURE__ */ new Map();
    for (const r of approved) {
      locked.set(r.id, { ...r, status: "exported", statusAt: at, statusBy: actor, batchId: id, exportedAt: at });
    }
    const snapshot = approved.map((r) => batchSnapshot(locked.get(r.id)));
    const total = Math.round(approved.reduce((sum, r) => sum + (Number(r.total) || 0), 0) * 100) / 100;
    const batch = {
      id,
      at,
      actor,
      receiptIds: approved.map((r) => r.id),
      count: approved.length,
      total,
      downloads: [],
      corrections: approved.filter((r) => (r.revision || 0) > 0).map((r) => r.id),
      receipts: snapshot
    };
    const drafts = [
      { at, actor, action: "batch.created", receiptId: null, batchId: id, field: null, line: null, from: null, to: null, note: `${batch.count} receipts` },
      ...approved.map((r) => ({
        at,
        actor,
        action: "status.changed",
        receiptId: r.id,
        batchId: id,
        field: "status",
        line: null,
        from: "approved",
        to: "exported",
        note: null
      }))
    ];
    return {
      ok: true,
      batch,
      receipts: receipts.map((r) => locked.get(r.id) ?? r),
      batches: [...batches, batch],
      drafts
    };
  }
  function reopenReceipt(receipt, reason, actor, now) {
    if (receipt.status !== "exported") return { ok: false, error: "Only exported receipts can be reopened." };
    const note = (reason || "").trim();
    if (note.length < MIN_WAIVER_NOTE_LENGTH) {
      return { ok: false, error: `Write a reason of at least ${MIN_WAIVER_NOTE_LENGTH} characters.` };
    }
    const at = now.toISOString();
    const to = transition("exported", "reopen");
    if (to === null) return { ok: false, error: "This receipt cannot be reopened." };
    const oldRevision = receipt.revision || 0;
    const newRevision = oldRevision + 1;
    const reopened = { ...receipt, status: to, statusAt: at, statusBy: actor, revision: newRevision };
    const drafts = [
      {
        at,
        actor,
        action: "batch.receipt.reopened",
        receiptId: receipt.id,
        batchId: receipt.batchId ?? null,
        field: "revision",
        line: null,
        from: oldRevision,
        to: newRevision,
        note
      },
      {
        at,
        actor,
        action: "status.changed",
        receiptId: receipt.id,
        batchId: receipt.batchId ?? null,
        field: "status",
        line: null,
        from: "exported",
        to,
        note: "reopened"
      }
    ];
    return { ok: true, receipt: reopened, drafts };
  }

  // src/core/migrate.ts
  var SESSION_SCHEMA = 2;
  function migrateSession(session, at, actor) {
    const fromSchema = session.schema ?? 1;
    if (fromSchema > SESSION_SCHEMA) {
      throw new Error(`This file was saved by a newer version (schema ${fromSchema}). Update the app to open it.`);
    }
    let needsReview = 0;
    const receipts = (session.receipts || []).map((r) => {
      const withDefaults = {
        ...r,
        waivers: r.waivers ?? [],
        batchId: r.batchId ?? null,
        exportedAt: r.exportedAt ?? null,
        revision: r.revision ?? 0
      };
      if (r.status) return withDefaults;
      needsReview += 1;
      return { ...withDefaults, status: "needs_review", statusAt: at, statusBy: actor };
    });
    let auditLog = [...session.auditLog || []];
    if (receipts.length > 0 && auditLog.length === 0) {
      auditLog = appendLogEntry(auditLog, {
        at,
        actor,
        action: "session.migrated",
        receiptId: null,
        batchId: null,
        field: null,
        line: null,
        from: fromSchema,
        to: SESSION_SCHEMA,
        note: `Migrated from schema ${fromSchema}; ${needsReview} receipts set to Needs review`
      });
    }
    return {
      ...session,
      schema: SESSION_SCHEMA,
      receipts,
      auditLog,
      batches: session.batches || [],
      actorName: session.actorName || actor
    };
  }
  return __toCommonJS(index_exports);
})();
