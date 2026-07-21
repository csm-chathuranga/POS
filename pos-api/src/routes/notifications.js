const router = require('express').Router();
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const db = req.db;

  const [lowStock, recentSales] = await Promise.all([
    db.query(
      `SELECT id, name, name_si, stock_qty, alert_qty, unit
       FROM products
       WHERE active = 1 AND stock_qty <= alert_qty
       ORDER BY stock_qty ASC
       LIMIT 15`,
      { type: db.QueryTypes.SELECT }
    ),
    db.query(
      `SELECT s.id, s.invoice_no, s.total, s.created_at, u.name AS user_name
       FROM sales s JOIN users u ON s.user_id = u.id
       WHERE s.status != 'held'
       ORDER BY s.id DESC LIMIT 6`,
      { type: db.QueryTypes.SELECT }
    ),
  ]);

  res.json({ lowStock, recentSales });
});

module.exports = router;
