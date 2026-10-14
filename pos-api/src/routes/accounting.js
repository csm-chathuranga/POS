const router = require('express').Router();
const { Op }  = require('sequelize');
const auth    = require('../middleware/auth');

router.use(auth);

// GET /api/accounting/status — diagnostic: check if auto-posting is fully configured
router.get('/status', async (req, res) => {
  const { Setting, Account, JournalEntry } = req.models;
  const result = { ok: true, issues: [] };

  // 1. Module enabled?
  try {
    const s = await Setting.findOne({ where: { key: 'module.accounting.enabled' } });
    result.module_enabled = s?.value === 'true';
    if (!result.module_enabled) result.issues.push('Accounting module is not enabled — go to Admin > Modules and enable it');
  } catch (e) {
    result.module_enabled = false;
    result.issues.push(`settings table error: ${e.message}`);
  }

  // 2. Accounting tables migrated?
  try {
    await JournalEntry.count();
    result.tables_migrated = true;
  } catch (e) {
    result.tables_migrated = false;
    result.issues.push('Accounting tables missing — run: node scripts/migrate-accounting.js localhost');
  }

  // 3. Key accounts seeded?
  const requiredCodes = ['1010', '1020', '1100', '2010', '4010', '5000'];
  try {
    const found = await Account.findAll({ where: { code: requiredCodes }, attributes: ['code', 'name'] });
    const foundCodes = found.map(a => a.code);
    const missing = requiredCodes.filter(c => !foundCodes.includes(c));
    result.accounts_seeded = missing.length === 0;
    result.found_accounts  = found.map(a => `${a.code} ${a.name}`);
    result.missing_accounts = missing;
    if (missing.length > 0) result.issues.push(`Missing accounts: ${missing.join(', ')} — run: node scripts/seed-accounts.js localhost`);
  } catch (e) {
    result.accounts_seeded = false;
    result.issues.push(`accounts table error: ${e.message}`);
  }

  result.ok = result.issues.length === 0;
  res.json(result);
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function nextRefNo(JournalEntry) {
  const year  = new Date().getFullYear();
  const count = await JournalEntry.count({
    where: { ref_no: { [Op.like]: `JE-${year}-%` } },
  });
  return `JE-${year}-${String(count + 1).padStart(4, '0')}`;
}

function toNum(v) { return parseFloat(v) || 0; }

// ── Accounts ─────────────────────────────────────────────────────────────────

router.get('/accounts', async (req, res) => {
  const { Account } = req.models;
  const accounts = await Account.findAll({ order: [['code', 'ASC']] });
  res.json(accounts);
});

router.post('/accounts', async (req, res) => {
  const { Account } = req.models;
  const { code, name, type, parent_id } = req.body;
  if (!code?.trim() || !name?.trim() || !type) {
    return res.status(400).json({ error: 'code, name and type are required' });
  }
  const account = await Account.create({
    code: code.trim(),
    name: name.trim(),
    type,
    parent_id: parent_id || null,
  });
  res.status(201).json(account);
});

router.patch('/accounts/:id', async (req, res) => {
  const { Account } = req.models;
  const account = await Account.findByPk(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const { code, name, type, parent_id } = req.body;
  await account.update({
    code:      code?.trim()  ?? account.code,
    name:      name?.trim()  ?? account.name,
    type:      type          ?? account.type,
    parent_id: parent_id !== undefined ? (parent_id || null) : account.parent_id,
  });
  res.json(account);
});

router.delete('/accounts/:id', async (req, res) => {
  const { Account, JournalLine } = req.models;
  const account = await Account.findByPk(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const lineCount = await JournalLine.count({ where: { account_id: account.id } });
  if (lineCount > 0) {
    return res.status(400).json({ error: 'Cannot delete account that has journal entries' });
  }
  await account.destroy();
  res.json({ ok: true });
});

// ── Journal ───────────────────────────────────────────────────────────────────

router.get('/journal', async (req, res) => {
  const { JournalEntry, JournalLine, Account, User } = req.models;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  const { count, rows } = await JournalEntry.findAndCountAll({
    include: [
      { model: JournalLine, as: 'lines', include: [{ model: Account, as: 'account', attributes: ['id', 'code', 'name'] }] },
      { model: User,        as: 'user',  attributes: ['id', 'name'] },
    ],
    order: [['date', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({ total: count, page, limit, data: rows });
});

router.post('/journal', async (req, res) => {
  const { JournalEntry, JournalLine } = req.models;
  const { date, description, lines } = req.body;

  if (!date) return res.status(400).json({ error: 'date is required' });
  if (!Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json({ error: 'At least 2 journal lines are required' });
  }

  const totalDebit  = lines.reduce((s, l) => s + toNum(l.debit),  0);
  const totalCredit = lines.reduce((s, l) => s + toNum(l.credit), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return res.status(400).json({ error: `Entry is not balanced — debits (${totalDebit.toFixed(2)}) ≠ credits (${totalCredit.toFixed(2)})` });
  }
  if (totalDebit === 0) {
    return res.status(400).json({ error: 'Entry must have non-zero amounts' });
  }

  const ref_no = await nextRefNo(JournalEntry);
  const entry  = await JournalEntry.create({ ref_no, date, description: description || null, user_id: req.user.id });

  await JournalLine.bulkCreate(lines.map(l => ({
    entry_id:   entry.id,
    account_id: l.account_id,
    debit:      toNum(l.debit),
    credit:     toNum(l.credit),
    note:       l.note?.trim() || null,
  })));

  const full = await JournalEntry.findByPk(entry.id, {
    include: [{ model: JournalLine, as: 'lines' }],
  });
  res.status(201).json(full);
});

router.get('/journal/:id', async (req, res) => {
  const { JournalEntry, JournalLine, Account, User } = req.models;
  const entry = await JournalEntry.findByPk(req.params.id, {
    include: [
      { model: JournalLine, as: 'lines', include: [{ model: Account, as: 'account', attributes: ['id', 'code', 'name', 'type'] }] },
      { model: User,        as: 'user',  attributes: ['id', 'name'] },
    ],
  });
  if (!entry) return res.status(404).json({ error: 'Journal entry not found' });
  res.json(entry);
});

// ── Reports ───────────────────────────────────────────────────────────────────

router.get('/reports/trial-balance', async (req, res) => {
  const { Account, JournalLine } = req.models;
  const accounts = await Account.findAll({ order: [['code', 'ASC']] });

  const lines = await JournalLine.findAll({
    attributes: [
      'account_id',
      [JournalLine.sequelize.fn('SUM', JournalLine.sequelize.col('debit')),  'total_debit'],
      [JournalLine.sequelize.fn('SUM', JournalLine.sequelize.col('credit')), 'total_credit'],
    ],
    group: ['account_id'],
  });

  const byAccount = Object.fromEntries(lines.map(l => [l.account_id, l]));

  const rows = accounts.map(a => {
    const dr = toNum(byAccount[a.id]?.dataValues.total_debit);
    const cr = toNum(byAccount[a.id]?.dataValues.total_credit);
    const debitNormal = ['asset', 'expense'].includes(a.type);
    const balance = debitNormal ? dr - cr : cr - dr;
    return { id: a.id, code: a.code, name: a.name, type: a.type, parent_id: a.parent_id, total_debit: dr, total_credit: cr, balance };
  });

  res.json(rows);
});

router.get('/reports/profit-loss', async (req, res) => {
  const { Account, JournalLine, JournalEntry } = req.models;
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to date params are required' });

  const entries = await JournalEntry.findAll({
    where: { date: { [Op.between]: [from, to] } },
    attributes: ['id'],
  });
  const entryIds = entries.map(e => e.id);

  if (entryIds.length === 0) {
    return res.json({ from, to, income: [], expenses: [], total_income: 0, total_expenses: 0, net: 0 });
  }

  const accounts = await Account.findAll({
    where: { type: { [Op.in]: ['income', 'expense'] } },
    order: [['code', 'ASC']],
  });

  const lines = await JournalLine.findAll({
    where: { entry_id: { [Op.in]: entryIds } },
    attributes: [
      'account_id',
      [JournalLine.sequelize.fn('SUM', JournalLine.sequelize.col('debit')),  'total_debit'],
      [JournalLine.sequelize.fn('SUM', JournalLine.sequelize.col('credit')), 'total_credit'],
    ],
    group: ['account_id'],
  });

  const byAccount = Object.fromEntries(lines.map(l => [l.account_id, l]));

  const income   = [];
  const expenses = [];

  for (const a of accounts) {
    const dr = toNum(byAccount[a.id]?.dataValues.total_debit);
    const cr = toNum(byAccount[a.id]?.dataValues.total_credit);
    const amount = a.type === 'income' ? cr - dr : dr - cr;
    const row = { id: a.id, code: a.code, name: a.name, amount };
    if (a.type === 'income')  income.push(row);
    else                      expenses.push(row);
  }

  const total_income   = income.reduce((s, r) => s + r.amount, 0);
  const total_expenses = expenses.reduce((s, r) => s + r.amount, 0);

  res.json({ from, to, income, expenses, total_income, total_expenses, net: total_income - total_expenses });
});

// ── Balance Sheet ─────────────────────────────────────────────────────────────

router.get('/reports/balance-sheet', async (req, res) => {
  const { Account, JournalLine } = req.models;
  const accounts = await Account.findAll({ order: [['code', 'ASC']] });

  const lines = await JournalLine.findAll({
    attributes: [
      'account_id',
      [JournalLine.sequelize.fn('SUM', JournalLine.sequelize.col('debit')),  'total_debit'],
      [JournalLine.sequelize.fn('SUM', JournalLine.sequelize.col('credit')), 'total_credit'],
    ],
    group: ['account_id'],
  });

  const byAccount = Object.fromEntries(lines.map(l => [l.account_id, l]));

  const row = a => {
    const dr = toNum(byAccount[a.id]?.dataValues.total_debit);
    const cr = toNum(byAccount[a.id]?.dataValues.total_credit);
    const debitNormal = ['asset', 'expense'].includes(a.type);
    const balance = debitNormal ? dr - cr : cr - dr;
    return { id: a.id, code: a.code, name: a.name, type: a.type, parent_id: a.parent_id, balance };
  };

  const assets      = accounts.filter(a => a.type === 'asset').map(row);
  const liabilities = accounts.filter(a => a.type === 'liability').map(row);
  const equity      = accounts.filter(a => a.type === 'equity').map(row);

  // Net income from income/expense accounts is added to retained earnings
  const incomeRows  = accounts.filter(a => a.type === 'income').map(row);
  const expenseRows = accounts.filter(a => a.type === 'expense').map(row);
  const netIncome   = incomeRows.reduce((s, r) => s + r.balance, 0)
                    - expenseRows.reduce((s, r) => s + r.balance, 0);

  res.json({
    assets,
    liabilities,
    equity,
    net_income:        netIncome,
    total_assets:      assets.reduce((s, r) => s + r.balance, 0),
    total_liabilities: liabilities.reduce((s, r) => s + r.balance, 0),
    total_equity:      equity.reduce((s, r) => s + r.balance, 0) + netIncome,
  });
});

// ── General Ledger ────────────────────────────────────────────────────────────

router.get('/ledger', async (req, res) => {
  const { Account, JournalLine, JournalEntry } = req.models;
  const { account_id, from, to } = req.query;
  if (!account_id) return res.status(400).json({ error: 'account_id is required' });

  const entryWhere = {};
  if (from && to) entryWhere.date = { [Op.between]: [from, to] };
  else if (from)  entryWhere.date = { [Op.gte]: from };
  else if (to)    entryWhere.date = { [Op.lte]: to };

  const lines = await JournalLine.findAll({
    where: { account_id },
    include: [{
      model: JournalEntry, as: 'entry',
      where: Object.keys(entryWhere).length ? entryWhere : undefined,
      attributes: ['id', 'ref_no', 'date', 'description'],
    }],
    order: [
      [{ model: JournalEntry, as: 'entry' }, 'date', 'ASC'],
      [{ model: JournalEntry, as: 'entry' }, 'id',   'ASC'],
    ],
  });

  const account = await Account.findByPk(account_id);
  const debitNormal = account && ['asset', 'expense'].includes(account.type);

  let balance = 0;
  const rows = lines.map(l => {
    const dr = toNum(l.debit);
    const cr = toNum(l.credit);
    balance += debitNormal ? (dr - cr) : (cr - dr);
    return {
      id: l.id, date: l.entry.date, ref_no: l.entry.ref_no,
      description: l.entry.description, note: l.note,
      debit: dr, credit: cr, balance,
    };
  });

  res.json({ account, rows });
});

// ── Opening Balances ──────────────────────────────────────────────────────────
// Stored as a single journal entry with ref_no OB-{YYYY}

router.get('/opening-balance', async (req, res) => {
  const { JournalEntry, JournalLine, Account } = req.models;
  const entry = await JournalEntry.findOne({
    where: { ref_no: { [Op.like]: 'OB-%' } },
    order: [['id', 'DESC']],
    include: [{
      model: JournalLine, as: 'lines',
      include: [{ model: Account, as: 'account', attributes: ['id', 'code', 'name', 'type'] }],
    }],
  });
  if (!entry) return res.json({ entry: null, lines: [] });
  res.json({
    entry: { id: entry.id, ref_no: entry.ref_no, date: entry.date },
    lines: entry.lines.map(l => ({
      account_id: l.account_id,
      account: l.account,
      debit:  toNum(l.debit),
      credit: toNum(l.credit),
    })),
  });
});

router.post('/opening-balance', async (req, res) => {
  const { JournalEntry, JournalLine } = req.models;
  const { date, lines = [] } = req.body;

  // Replace any existing OB entry
  const existing = await JournalEntry.findAll({ where: { ref_no: { [Op.like]: 'OB-%' } } });
  for (const e of existing) {
    await JournalLine.destroy({ where: { entry_id: e.id } });
    await e.destroy();
  }

  const validLines = lines.filter(l => toNum(l.debit) > 0 || toNum(l.credit) > 0);
  if (!validLines.length) return res.json({ ok: true, entry: null, message: 'Opening balances cleared' });

  const obDate = date || `${new Date().getFullYear()}-01-01`;
  const entry = await JournalEntry.create({
    ref_no:      `OB-${new Date(obDate).getFullYear()}`,
    date:        obDate,
    description: 'Opening Balances',
    user_id:     req.user.id,
  });

  await JournalLine.bulkCreate(validLines.map(l => ({
    entry_id:   entry.id,
    account_id: l.account_id,
    debit:      toNum(l.debit),
    credit:     toNum(l.credit),
    note:       'Opening Balance',
  })));

  res.json({ ok: true, entry: { id: entry.id, ref_no: entry.ref_no, date: entry.date } });
});

// ── Expenses ──────────────────────────────────────────────────────────────────
// Returns journal entries that have at least one line debiting an expense account

router.get('/expenses', async (req, res) => {
  const { JournalEntry, JournalLine, Account, User } = req.models;
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);

  const expenseAccounts = await Account.findAll({ where: { type: 'expense' }, attributes: ['id'] });
  const expIds = expenseAccounts.map(a => a.id);
  if (!expIds.length) return res.json({ total: 0, page, limit, data: [] });

  const entryIdRows = await JournalLine.findAll({
    where: { account_id: { [Op.in]: expIds }, debit: { [Op.gt]: 0 } },
    attributes: ['entry_id'],
    group: ['entry_id'],
    raw: true,
  });
  const entryIds = entryIdRows.map(r => r.entry_id);
  if (!entryIds.length) return res.json({ total: 0, page, limit, data: [] });

  const { count, rows } = await JournalEntry.findAndCountAll({
    where: { id: { [Op.in]: entryIds } },
    include: [
      { model: JournalLine, as: 'lines', include: [{ model: Account, as: 'account', attributes: ['id', 'code', 'name', 'type'] }] },
      { model: User,        as: 'user',  attributes: ['id', 'name'] },
    ],
    order: [['date', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  res.json({ total: count, page, limit, data: rows });
});

// ── Cash Book ─────────────────────────────────────────────────────────────────
// Returns all journal lines for a given account (or cash/bank accounts by default),
// joined with entry date/ref, ordered by date + entry id, with running balance.

router.get('/cashbook', async (req, res) => {
  const { Account, JournalLine, JournalEntry } = req.models;
  const { account_id, from, to } = req.query;

  let accountIds;
  if (account_id) {
    accountIds = [parseInt(account_id)];
  } else {
    // Default: all asset accounts with codes 1010–1030 (cash/bank)
    const cashAccounts = await Account.findAll({
      where: { code: { [Op.in]: ['1010', '1020', '1030'] } },
      attributes: ['id'],
    });
    accountIds = cashAccounts.map(a => a.id);
  }

  if (accountIds.length === 0) return res.json([]);

  const entryWhere = {};
  if (from && to) entryWhere.date = { [Op.between]: [from, to] };
  else if (from)  entryWhere.date = { [Op.gte]: from };
  else if (to)    entryWhere.date = { [Op.lte]: to };

  const lines = await JournalLine.findAll({
    where: { account_id: { [Op.in]: accountIds } },
    include: [{
      model: JournalEntry,
      as: 'entry',
      where: Object.keys(entryWhere).length ? entryWhere : undefined,
      attributes: ['id', 'ref_no', 'date', 'description'],
    }, {
      model: Account,
      as: 'account',
      attributes: ['id', 'code', 'name'],
    }],
    order: [
      [{ model: JournalEntry, as: 'entry' }, 'date', 'ASC'],
      [{ model: JournalEntry, as: 'entry' }, 'id',   'ASC'],
    ],
  });

  // Attach running balance
  let balance = 0;
  const rows = lines.map(l => {
    const dr = toNum(l.debit);
    const cr = toNum(l.credit);
    balance += dr - cr;
    return {
      id:          l.id,
      date:        l.entry.date,
      ref_no:      l.entry.ref_no,
      description: l.entry.description,
      account:     l.account,
      debit:       dr,
      credit:      cr,
      balance,
    };
  });

  res.json(rows);
});

module.exports = router;
