const router = require('express').Router();
const { Op }  = require('sequelize');
const auth    = require('../middleware/auth');

function dateRange(req) {
  const from = req.query.date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to   = req.query.date_to   || new Date().toISOString().slice(0, 10);
  return [`${from} 00:00:00`, `${to} 23:59:59`];
}

// GET /api/reports/today
router.get('/today', auth, async (req, res) => {
  const db   = req.db;
  const today = new Date().toISOString().slice(0, 10);

  const [sales, byPayment] = await Promise.all([
    db.query(`SELECT id, invoice_no, total, discount, tax, paid, balance, created_at FROM sales WHERE DATE(created_at) = ? AND status != 'held' ORDER BY id DESC`, { replacements: [today], type: db.QueryTypes.SELECT }),
    db.query(`SELECT p.method, SUM(p.amount) as total, COUNT(DISTINCT p.sale_id) as count FROM payments p JOIN sales s ON p.sale_id = s.id WHERE DATE(s.created_at) = ? AND s.status != 'held' GROUP BY p.method`, { replacements: [today], type: db.QueryTypes.SELECT }),
  ]);

  const summary = {
    total_sales:    sales.length,
    total_revenue:  sales.reduce((a, s) => a + parseFloat(s.total), 0),
    total_discount: sales.reduce((a, s) => a + parseFloat(s.discount), 0),
    total_tax:      sales.reduce((a, s) => a + parseFloat(s.tax), 0),
  };
  res.json({ sales, summary, byPayment, date: today });
});

// GET /api/reports/day-end?date=
router.get('/day-end', auth, async (req, res) => {
  const db   = req.db;
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const [sales, byPayment] = await Promise.all([
    db.query(`SELECT s.*, u.name as user_name FROM sales s JOIN users u ON s.user_id = u.id WHERE DATE(s.created_at) = ? AND s.status != 'held' ORDER BY s.id`, { replacements: [date], type: db.QueryTypes.SELECT }),
    db.query(`SELECT p.method, SUM(p.amount) as total, COUNT(DISTINCT p.sale_id) as count FROM payments p JOIN sales s ON p.sale_id = s.id WHERE DATE(s.created_at) = ? AND s.status != 'held' GROUP BY p.method`, { replacements: [date], type: db.QueryTypes.SELECT }),
  ]);

  const summary = {
    total_bills:    sales.length,
    total_revenue:  sales.reduce((a, s) => a + parseFloat(s.total), 0),
    total_discount: sales.reduce((a, s) => a + parseFloat(s.discount), 0),
    total_paid:     sales.reduce((a, s) => a + parseFloat(s.paid), 0),
    total_balance:  sales.reduce((a, s) => a + parseFloat(s.balance), 0),
  };
  res.json({ sales, summary, byPayment, date });
});

// GET /api/reports/monthly?month=2026-07
router.get('/monthly', auth, async (req, res) => {
  const db = req.db;
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const [year, mo] = month.split('-');
  const start = `${month}-01 00:00:00`;
  const end   = new Date(year, mo, 0).toISOString().slice(0, 10) + ' 23:59:59';

  const byDay = await db.query(`
    SELECT DATE(created_at) as date, SUM(total) as total, SUM(discount) as discount, COUNT(*) as count
    FROM sales WHERE created_at BETWEEN ? AND ? AND status != 'held'
    GROUP BY DATE(created_at) ORDER BY date
  `, { replacements: [start, end], type: db.QueryTypes.SELECT });

  res.json({ byDay, summary: { month, total_revenue: byDay.reduce((a, d) => a + parseFloat(d.total), 0), total_sales: byDay.reduce((a, d) => a + d.count, 0) } });
});

// GET /api/reports/top-products
router.get('/top-products', auth, async (req, res) => {
  const db = req.db;
  const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const topProducts = await db.query(`
    SELECT si.product_id, si.product_name, SUM(si.qty) as total_qty,
           SUM(si.total) as total_revenue, COUNT(DISTINCT si.sale_id) as sale_count
    FROM sale_items si JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at >= ? AND s.status != 'held'
    GROUP BY si.product_id, si.product_name ORDER BY total_qty DESC LIMIT 10
  `, { replacements: [`${from} 00:00:00`], type: db.QueryTypes.SELECT });

  res.json({ topProducts, from, to: new Date().toISOString().slice(0, 10) });
});

// GET /api/reports/low-stock
router.get('/low-stock', auth, async (req, res) => {
  const { Product, Category } = req.models;
  const products = await Product.findAll({
    where: { active: true },
    having: db => db.literal('stock_qty <= alert_qty'),
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [['stock_qty', 'ASC']],
  });
  res.json({ products });
});

// GET /api/reports/profit?date_from=&date_to=
router.get('/profit', auth, async (req, res) => {
  const db = req.db;
  const [from, to] = dateRange(req);

  const [items, salesSummary] = await Promise.all([
    db.query(`
      SELECT si.product_id, si.product_name, si.unit_price, si.cost_price,
             (si.unit_price - si.cost_price) as unit_profit,
             SUM(si.qty) as total_qty,
             SUM(si.unit_price * si.qty) as gross_revenue,
             SUM(si.discount) as total_item_discount,
             SUM(si.total) as net_revenue,
             SUM(si.cost_price * si.qty) as total_cost,
             SUM((si.unit_price - si.cost_price) * si.qty) as gross_profit
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ? AND s.status != 'held'
      GROUP BY si.product_id, si.product_name, si.unit_price, si.cost_price
      ORDER BY si.product_name
    `, { replacements: [from, to], type: db.QueryTypes.SELECT }),
    db.query(`SELECT COUNT(*) as total_bills, SUM(subtotal) as subtotal, SUM(discount) as bill_discount, SUM(total) as net_total FROM sales WHERE created_at BETWEEN ? AND ? AND status != 'held'`, { replacements: [from, to], type: db.QueryTypes.SELECT }),
  ]);

  const ss          = salesSummary[0] || {};
  const grossRevenue  = items.reduce((a, i) => a + parseFloat(i.gross_revenue), 0);
  const itemDiscount  = items.reduce((a, i) => a + parseFloat(i.total_item_discount), 0);
  const billDiscount  = parseFloat(ss.bill_discount || 0);
  const totalDiscount = itemDiscount + billDiscount;
  const totalCost     = items.reduce((a, i) => a + parseFloat(i.total_cost), 0);
  const grossProfit   = items.reduce((a, i) => a + parseFloat(i.gross_profit), 0);

  res.json({
    items,
    summary: {
      total_bills: parseInt(ss.total_bills || 0),
      gross_revenue: grossRevenue, item_discount: itemDiscount, bill_discount: billDiscount,
      total_discount: totalDiscount, net_revenue: grossRevenue - totalDiscount,
      total_cost: totalCost, gross_profit: grossProfit, net_profit: grossProfit - totalDiscount,
    },
    date_from: req.query.date_from, date_to: req.query.date_to,
  });
});

// GET /api/reports/credit-customers
router.get('/credit-customers', auth, async (req, res) => {
  const { Customer } = req.models;
  const customers = await Customer.findAll({
    where: { credit_balance: { [Op.gt]: 0 } },
    order: [['credit_balance', 'DESC']],
  });
  const totalCredit = customers.reduce((a, c) => a + parseFloat(c.credit_balance), 0);
  res.json({ customers, totalCredit });
});

// GET /api/reports/stock-summary
router.get('/stock-summary', auth, async (req, res) => {
  const { Product, Category } = req.models;
  const { Op } = require('sequelize');
  const where = { active: true };
  if (req.query.search) {
    const s = req.query.search;
    where[Op.or] = [{ name: { [Op.like]: `%${s}%` } }, { sku: { [Op.like]: `%${s}%` } }];
  }
  if (req.query.category_id) where.category_id = req.query.category_id;

  const page  = parseInt(req.query.page || '1');
  const limit = 50;
  const { count, rows } = await Product.findAndCountAll({
    where,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [['name', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });

  const all = await Product.findOne({
    where: { active: true },
    attributes: [
      [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'total_products'],
      [Product.sequelize.fn('SUM', Product.sequelize.col('stock_qty')), 'total_units'],
      [Product.sequelize.literal('SUM(cost_price * stock_qty)'), 'total_cost_value'],
      [Product.sequelize.literal('SUM(selling_price * stock_qty)'), 'total_retail_value'],
    ],
    raw: true,
  });

  res.json({ products: { data: rows, total: count, page, last_page: Math.ceil(count / limit) }, summary: all });
});

// GET /api/reports/revenue
router.get('/revenue', auth, async (req, res) => {
  const db = req.db;
  const [from, to] = dateRange(req);

  const [byDay, billDiscountsByDay, byPayment] = await Promise.all([
    db.query(`
      SELECT DATE(s.created_at) as date, COUNT(DISTINCT s.id) as total_bills,
             SUM(si.unit_price * si.qty) as gross_revenue, SUM(si.discount) as item_discount,
             SUM(si.total) as net_revenue, SUM(si.cost_price * si.qty) as total_cost,
             SUM((si.unit_price - si.cost_price) * si.qty) as gross_profit
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ? AND s.status != 'held'
      GROUP BY DATE(s.created_at) ORDER BY date
    `, { replacements: [from, to], type: db.QueryTypes.SELECT }),
    db.query(`SELECT DATE(created_at) as date, SUM(discount) as bill_discount FROM sales WHERE created_at BETWEEN ? AND ? AND status != 'held' GROUP BY DATE(created_at)`, { replacements: [from, to], type: db.QueryTypes.SELECT }),
    db.query(`SELECT p.method, SUM(p.amount) as total FROM payments p JOIN sales s ON p.sale_id = s.id WHERE s.created_at BETWEEN ? AND ? AND s.status != 'held' GROUP BY p.method`, { replacements: [from, to], type: db.QueryTypes.SELECT }),
  ]);

  const discMap = Object.fromEntries(billDiscountsByDay.map(r => [r.date, parseFloat(r.bill_discount)]));
  byDay.forEach(row => {
    row.bill_discount  = discMap[row.date] || 0;
    row.total_discount = parseFloat(row.item_discount) + row.bill_discount;
    row.net_profit     = parseFloat(row.gross_profit) - row.total_discount;
  });

  res.json({ byDay, byPayment, date_from: req.query.date_from, date_to: req.query.date_to });
});

module.exports = router;
