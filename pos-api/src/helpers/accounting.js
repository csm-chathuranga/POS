/**
 * Auto-post transactions to the double-entry journal.
 * All functions are safe to call unconditionally — they silently no-op when
 * the accounting module is disabled or when required accounts are missing.
 * Missing accounts produce a console.warn so you can diagnose missing seeds.
 */

const { Op } = require('sequelize');

const PAYMENT_METHOD_ACCOUNT = {
  cash:   '1010', // Cash in Hand
  card:   '1020', // Bank Account
  qr:     '1020', // Bank Account
  credit: '1100', // Accounts Receivable
};

async function isEnabled(models) {
  try {
    const s = await models.Setting.findOne({ where: { key: 'module.accounting.enabled' } });
    return s?.value === 'true';
  } catch { return false; }
}

async function byCode(models, code) {
  try { return await models.Account.findOne({ where: { code } }); }
  catch { return null; }
}

async function nextRef(models, prefix) {
  const year  = new Date().getFullYear();
  const count = await models.JournalEntry.count({
    where: { ref_no: { [Op.like]: `${prefix}-${year}-%` } },
  });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
}

async function createEntry(models, { ref_no, date, description, user_id, lines }) {
  const { JournalEntry, JournalLine } = models;
  const totalDr = lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0);
  const totalCr = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  if (Math.abs(totalDr - totalCr) > 0.01) {
    console.warn(`[accounting] Skipping unbalanced entry ${ref_no} (dr=${totalDr.toFixed(2)} cr=${totalCr.toFixed(2)})`);
    return null;
  }
  const entry = await JournalEntry.create({ ref_no, date, description, user_id });
  await JournalLine.bulkCreate(lines.map(l => ({
    entry_id:   entry.id,
    account_id: l.account_id,
    debit:      parseFloat(l.debit)  || 0,
    credit:     parseFloat(l.credit) || 0,
    note:       l.note || null,
  })));
  return entry;
}

/**
 * Post a sale to the journal.
 * DR: cash/bank/receivable per payment method
 * CR: 4010 Sales Revenue (total)
 */
async function postSale(models, { sale, payments, user_id }) {
  try {
    if (!await isEnabled(models)) return;

    const salesAcc = await byCode(models, '4010');
    if (!salesAcc) {
      console.warn('[accounting] postSale: account 4010 (Sales Revenue) not found — seed chart of accounts first');
      return;
    }

    const date  = new Date().toISOString().slice(0, 10);
    const lines = [];

    for (const pmt of payments) {
      const code = PAYMENT_METHOD_ACCOUNT[pmt.method];
      if (!code) continue;
      const acc = await byCode(models, code);
      if (!acc) {
        console.warn(`[accounting] postSale: account ${code} not found for payment method '${pmt.method}'`);
        continue;
      }
      const amt = parseFloat(pmt.amount) || 0;
      if (amt > 0) lines.push({ account_id: acc.id, debit: amt, credit: 0 });
    }

    const totalDr = lines.reduce((s, l) => s + l.debit, 0);
    if (totalDr <= 0 || !lines.length) return;

    lines.push({ account_id: salesAcc.id, debit: 0, credit: totalDr });

    const ref_no = await nextRef(models, 'SALE');
    await createEntry(models, { ref_no, date, description: `Sale ${sale.invoice_no}`, user_id, lines });
  } catch (e) {
    console.error('[accounting] postSale error:', e.message);
  }
}

/**
 * Post a purchase to the journal.
 * DR: 5000 COGS (total)
 * CR: 1010 Cash (paid) + 2010 Accounts Payable (unpaid)
 */
async function postPurchase(models, { purchase, total, paid, user_id }) {
  try {
    if (!await isEnabled(models)) return;

    const [cogsAcc, cashAcc, apAcc] = await Promise.all([
      byCode(models, '5000'),
      byCode(models, '1010'),
      byCode(models, '2010'),
    ]);
    if (!cogsAcc) {
      console.warn('[accounting] postPurchase: account 5000 (COGS) not found — seed chart of accounts first');
      return;
    }

    const totalAmt  = parseFloat(total) || 0;
    const paidAmt   = parseFloat(paid)  || 0;
    const unpaidAmt = Math.max(0, totalAmt - paidAmt);
    if (totalAmt <= 0) return;

    const lines = [{ account_id: cogsAcc.id, debit: totalAmt, credit: 0 }];
    if (paidAmt   > 0 && cashAcc) lines.push({ account_id: cashAcc.id, debit: 0, credit: paidAmt   });
    if (unpaidAmt > 0 && apAcc)   lines.push({ account_id: apAcc.id,   debit: 0, credit: unpaidAmt });

    const creditSide = lines.filter(l => l.credit > 0).reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalAmt - creditSide) > 0.01) {
      console.warn(`[accounting] postPurchase: cannot balance — total=${totalAmt} credit=${creditSide} (missing cash/AP accounts?)`);
      return;
    }

    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'PURCH');
    await createEntry(models, { ref_no, date, description: `Purchase ${purchase.grn_no}`, user_id, lines });
  } catch (e) {
    console.error('[accounting] postPurchase error:', e.message);
  }
}

/**
 * Post a customer credit settlement to the journal.
 * Customer pays cash to reduce their outstanding balance.
 * DR: 1010 Cash in Hand
 * CR: 1100 Accounts Receivable
 */
async function postCreditSettle(models, { invoice_no, amount, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const [cashAcc, arAcc] = await Promise.all([
      byCode(models, '1010'),
      byCode(models, '1100'),
    ]);
    if (!cashAcc || !arAcc) {
      console.warn('[accounting] postCreditSettle: account 1010 or 1100 not found');
      return;
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;

    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'REC');
    await createEntry(models, {
      ref_no, date,
      description: `Credit receipt ${invoice_no}`,
      user_id,
      lines: [
        { account_id: cashAcc.id, debit: amt, credit: 0   },
        { account_id: arAcc.id,   debit: 0,   credit: amt },
      ],
    });
  } catch (e) {
    console.error('[accounting] postCreditSettle error:', e.message);
  }
}

/**
 * Post a manual credit adjustment.
 * type='reduce': customer pays/debt written off → DR AR 1100, CR Cash 1010
 * type='add':    credit note/return added       → DR Sales Revenue 4010, CR AR 1100
 */
async function postCreditAdjustment(models, { ref, amount, type, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const [arAcc, cashAcc, salesAcc] = await Promise.all([
      byCode(models, '1100'),
      byCode(models, '1010'),
      byCode(models, '4010'),
    ]);
    if (!arAcc) return;

    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;

    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'ADJ');
    // reduce: customer pays/debt is cleared → DR Cash (in), CR AR (down)
    // add:    credit note/return added     → DR AR (up), CR Revenue
    const lines  = type === 'reduce'
      ? [
          { account_id: (cashAcc || arAcc).id, debit: amt, credit: 0   },
          { account_id: arAcc.id,              debit: 0,   credit: amt },
        ]
      : salesAcc
        ? [
            { account_id: arAcc.id,    debit: amt, credit: 0   },
            { account_id: salesAcc.id, debit: 0,   credit: amt },
          ]
        : null;

    if (!lines) return;

    await createEntry(models, {
      ref_no, date,
      description: `Credit adjustment ${ref}`,
      user_id,
      lines,
    });
  } catch (e) {
    console.error('[accounting] postCreditAdjustment error:', e.message);
  }
}

/**
 * Post a supplier payment to the journal.
 * DR: 2010 Accounts Payable
 * CR: 1010 Cash in Hand
 */
async function postSupplierPayment(models, { ref_no: sourceRef, amount, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const [apAcc, cashAcc] = await Promise.all([
      byCode(models, '2010'),
      byCode(models, '1010'),
    ]);
    if (!apAcc || !cashAcc) {
      console.warn('[accounting] postSupplierPayment: account 2010 or 1010 not found');
      return;
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;

    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'PAY');
    await createEntry(models, {
      ref_no, date,
      description: `Supplier payment ${sourceRef}`,
      user_id,
      lines: [
        { account_id: apAcc.id,   debit: amt, credit: 0   },
        { account_id: cashAcc.id, debit: 0,   credit: amt },
      ],
    });
  } catch (e) {
    console.error('[accounting] postSupplierPayment error:', e.message);
  }
}

/**
 * Post a purchase return to the journal.
 * DR: 2010 Accounts Payable (reduces liability — we owe less)
 * CR: 5000 COGS (reduces cost of goods)
 */
async function postPurchaseReturn(models, { return_no, total, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const [apAcc, cogsAcc] = await Promise.all([
      byCode(models, '2010'),
      byCode(models, '5000'),
    ]);
    if (!apAcc || !cogsAcc) {
      console.warn('[accounting] postPurchaseReturn: accounts 2010 or 5000 not found');
      return;
    }
    const amt = parseFloat(total) || 0;
    if (amt <= 0) return;
    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'PRN');
    await createEntry(models, {
      ref_no, date,
      description: `Purchase return ${return_no}`,
      user_id,
      lines: [
        { account_id: apAcc.id,   debit: amt, credit: 0   },
        { account_id: cogsAcc.id, debit: 0,   credit: amt },
      ],
    });
  } catch (e) {
    console.error('[accounting] postPurchaseReturn error:', e.message);
  }
}

/**
 * Post a sale return to the journal.
 * DR: 4010 Sales Revenue (reduces revenue)
 * CR: 1010 Cash (cash refunded)
 */
async function postSaleReturn(models, { return_no, total, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const [salesAcc, cashAcc] = await Promise.all([
      byCode(models, '4010'),
      byCode(models, '1010'),
    ]);
    if (!salesAcc || !cashAcc) {
      console.warn('[accounting] postSaleReturn: accounts 4010 or 1010 not found');
      return;
    }
    const amt = parseFloat(total) || 0;
    if (amt <= 0) return;
    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'RET');
    await createEntry(models, {
      ref_no, date,
      description: `Sale return ${return_no}`,
      user_id,
      lines: [
        { account_id: salesAcc.id, debit: amt, credit: 0   },
        { account_id: cashAcc.id,  debit: 0,   credit: amt },
      ],
    });
  } catch (e) {
    console.error('[accounting] postSaleReturn error:', e.message);
  }
}

/**
 * Post mark-paid (customer settles outstanding credit balance).
 * DR: 1010 Cash
 * CR: 1100 Accounts Receivable
 */
async function postMarkPaid(models, { invoice_no, amount, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const [cashAcc, arAcc] = await Promise.all([
      byCode(models, '1010'),
      byCode(models, '1100'),
    ]);
    if (!cashAcc || !arAcc) return;
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'REC');
    await createEntry(models, {
      ref_no, date,
      description: `Credit settled ${invoice_no}`,
      user_id,
      lines: [
        { account_id: cashAcc.id, debit: amt, credit: 0   },
        { account_id: arAcc.id,   debit: 0,   credit: amt },
      ],
    });
  } catch (e) {
    console.error('[accounting] postMarkPaid error:', e.message);
  }
}

/**
 * Reverse every journal entry posted for a deleted sale (the sale itself and any
 * "credit settled" receipts) by posting opposite entries; originals stay visible.
 */
async function postSaleVoid(models, { invoice_no, user_id }) {
  return voidEntries(models, {
    descriptions: [`Sale ${invoice_no}`, `Credit settled ${invoice_no}`],
    label: invoice_no, user_id,
  });
}

/** Reverse the journal entry posted for a deleted purchase (GRN). */
async function postPurchaseVoid(models, { grn_no, user_id }) {
  return voidEntries(models, { descriptions: [`Purchase ${grn_no}`], label: grn_no, user_id });
}

async function voidEntries(models, { descriptions, label: invoice_no, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const { JournalEntry, JournalLine } = models;
    const entries = await JournalEntry.findAll({
      where: { description: { [Op.in]: descriptions } },
    });
    const date = new Date().toISOString().slice(0, 10);
    for (const orig of entries) {
      const lines = await JournalLine.findAll({ where: { entry_id: orig.id } });
      if (!lines.length) continue;
      const ref_no = await nextRef(models, 'VOID');
      await createEntry(models, {
        ref_no, date,
        description: `Void of ${orig.ref_no} (${invoice_no} deleted)`,
        user_id,
        lines: lines.map(l => ({
          account_id: l.account_id,
          debit:  parseFloat(l.credit) || 0,
          credit: parseFloat(l.debit)  || 0,
        })),
      });
    }
  } catch (e) {
    console.error('[accounting] void error:', e.message);
  }
}

/**
 * Post a salary payment to the journal.
 * DR: 6010 Salary Expense
 * CR: 1010 Cash
 */
async function postSalaryPayment(models, { ref_no: sourceRef, amount, employee_name, period, user_id }) {
  try {
    if (!await isEnabled(models)) return;
    const [salaryAcc, cashAcc] = await Promise.all([
      byCode(models, '6200'),
      byCode(models, '1010'),
    ]);
    if (!salaryAcc || !cashAcc) {
      console.warn('[accounting] postSalaryPayment: account 6200 (Salary Expense) not found — add it to chart of accounts');
      return;
    }
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    const date   = new Date().toISOString().slice(0, 10);
    const ref_no = await nextRef(models, 'SAL');
    await createEntry(models, {
      ref_no, date,
      description: `Salary: ${employee_name} – ${period}`,
      user_id,
      lines: [
        { account_id: salaryAcc.id, debit: amt, credit: 0   },
        { account_id: cashAcc.id,   debit: 0,   credit: amt },
      ],
    });
  } catch (e) {
    console.error('[accounting] postSalaryPayment error:', e.message);
  }
}

module.exports = { postSale, postPurchase, postCreditSettle, postCreditAdjustment, postSupplierPayment, postSaleReturn, postPurchaseReturn, postMarkPaid, postSaleVoid, postPurchaseVoid, postSalaryPayment };
