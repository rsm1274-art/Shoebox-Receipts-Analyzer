"""String patches for the editing features (see features.js). Each (old, new) must match exactly once."""


def patches():
    return [
        # ---- editable fixed lists ----
        ("const QBO_PAYMENT_ACCOUNTS = [", "let QBO_PAYMENT_ACCOUNTS = ["),
        ("const QBO_FLEET_CLASSES = [", "let QBO_FLEET_CLASSES = ["),
        ("receiptData.vanClass = 'Van #1 - Ford Transit 250';", "receiptData.vanClass = defaultFleetClass();"),
        ("const paidFromOptionsHtml = QBO_PAYMENT_ACCOUNTS.map(acc =>",
         "const paidFromOptionsHtml = listChoices(paymentAccountList, receipt.paidFromAccount).map(acc =>"),
        ("const vanClassOptionsHtml = QBO_FLEET_CLASSES.map(v =>",
         "const vanClassOptionsHtml = listChoices(fleetClassList, receipt.vanClass).map(v =>"),
        ("receipt.paidFromAccount === acc ? 'selected' : ''}>${acc}</option>",
         "receipt.paidFromAccount === acc ? 'selected' : ''}>${acc}${listArchivedSuffix(paymentAccountList, acc)}</option>"),
        ("receipt.vanClass === v ? 'selected' : ''}>${v}</option>",
         "receipt.vanClass === v ? 'selected' : ''}>${v}${listArchivedSuffix(fleetClassList, v)}</option>"),
        # ---- keyword matching: archived / CapEx-hidden accounts no longer auto-match ----
        ("// Rule 2: Match against active CoA keywords\n            for (const acc of coaAccounts) {",
         "// Rule 2: Match against active CoA keywords (archived and CapEx-hidden accounts are skipped)\n            for (const acc of getActiveCategories()) {"),
        # ---- built-in rules follow the account id, so renaming an account cannot break them ----
        ("return 'Fixed Assets: Equipment & Tools (> $2,500)';",
         "return (coaAccounts.find(c => c.id === 'fixed_assets') || { name: 'Fixed Assets: Equipment & Tools (> $2,500)' }).name;"),
        ("matchedCat.includes(\"Owner's Draw\") ||",
         "matchedCat.includes(\"Owner's Draw\") || (coaAccounts.find(c => c.name === matchedCat) || {}).id === 'owners_draw' ||"),
        ("const isFuelReceipt = qboSplits.some(s => s.category.includes('Fuel'));",
         "const isFuelReceipt = qboSplits.some(s => s.category.includes('Fuel') || (coaAccounts.find(c => c.name === s.category) || {}).id === 'veh_fuel');"),
        # ---- Option 2 CSV: CapEx_Flag is YES/NO like the on-screen preview ----
        ("escapeCsvCell(r.expensePhase),",
         "escapeCsvCell(/CapEx|Startup/.test(r.expensePhase || '') ? 'YES' : 'NO'),"),
        # ---- inspector: editable merchant + date ----
        ('<h2 class="inspector-title">${receipt.merchant}</h2>',
         '<h2 class="inspector-title"><input type="text" class="title-input" value="${fxEsc(receipt.merchant)}" aria-label="Merchant name" '
         'title="Click to edit the merchant name" onchange="updateReceiptMerchant(\'${receipt.id}\', this.value)"></h2>'),
        ('<span class="mono muted">Date: ${formatDateForQBO(receipt.date)}</span>',
         '<label class="date-edit mono muted" title="Receipt date (stored as YYYY-MM-DD)">Date '
         '<input type="date" class="input" value="${/^\d{4}-\d{2}-\d{2}$/.test(receipt.date || \'\') ? receipt.date : \'\'}" '
         'onchange="updateReceiptDate(\'${receipt.id}\', this.value)"></label>'
         '<span class="mono muted">QBO: ${formatDateForQBO(receipt.date)}</span>'),
        # ---- inspector: quantity + delete line ----
        ('<th class="num" style="padding:0 0.4rem">Item $</th>',
         '<th class="num" style="padding:0 0.4rem">Qty</th>\n'
         '                                                <th class="num" style="padding:0 0.4rem" title="Price of one unit">Unit $</th>'),
        ('<th class="num" title="Item price + pro-rata share of Tax & Tip">QBO Split $</th>',
         '<th class="num" title="Quantity x unit price + pro-rata share of Tax & Tip">QBO Split $</th>\n'
         '                                                <th></th>'),
        ('<td class="num" style="padding:0 0.4rem">',
         '<td class="num" style="padding:0 0.4rem"><input type="number" step="any" min="0" value="${item.qty ?? 1}" '
         'onchange="updateLineQty(\'${receipt.id}\', ${idx}, this.value)" class="cell-input num" style="width:3.6rem" aria-label="Quantity"></td>\n'
         '                    <td class="num" style="padding:0 0.4rem">'),
        ('$${Number(item.taxInclusiveAmount || item.price).toFixed(2)}',
         '$${Number(item.taxInclusiveAmount || item.price).toFixed(2)}\n                    </td>\n'
         '                    <td style="padding-left:0.2rem"><button onclick="deleteLineItem(\'${receipt.id}\', ${idx})" class="icon-btn" '
         'title="Delete this line" aria-label="Delete line">\u00d7</button>'),
    ]


CSS = """
/* --- editable header / quantity / delete line --- */
.title-input { font: inherit; letter-spacing: inherit; color: inherit; width: 100%; background: transparent; border: 0; border-bottom: 1px dashed rgba(128,128,128,.55); padding: 0; margin: 0; border-radius: 0; }
.title-input:focus { outline: 2px solid currentColor; outline-offset: 2px; border-bottom-color: transparent; }
.date-edit { display: inline-flex; align-items: center; gap: 0.35rem; }
.date-edit .input { padding: 0.15rem 0.35rem; font-size: 12px; }
td .icon-btn { font-size: 16px; line-height: 1; padding: 0.15rem 0.45rem; }
"""
