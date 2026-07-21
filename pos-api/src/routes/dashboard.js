const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { Sale, SaleItem, Product, Payment } = req.models;
  const db = req.db;

  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [
    todaySales, todayBills, monthSales, monthBills,
    totalProducts, lowStockCount,
    todayByPayment, recentSales, fastMoving, hourlySales, heatmap,
  ] = await Promise.all([
    Sale.sum('total',   { where: { status: { [Op.ne]: 'held' }, created_at: { [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`] } } }),
    Sale.count(         { where: { status: { [Op.ne]: 'held' }, created_at: { [Op.between]: [`${today} 00:00:00`, `${today} 23:59:59`] } } }),
    Sale.sum('total',   { where: { status: { [Op.ne]: 'held' }, created_at: { [Op.gte]: `${monthStart} 00:00:00` } } }),
    Sale.count(         { where: { status: { [Op.ne]: 'held' }, created_at: { [Op.gte]: `${monthStart} 00:00:00` } } }),
    Product.count(      { where: { active: true } }),
    Product.count(      { where: { active: true, stock_qty: { [Op.lte]: db.literal('alert_qty') } } }),

    db.query(`
      SELECT p.method, SUM(p.amount) as total, COUNT(DISTINCT p.sale_id) as bills
      FROM payments p JOIN sales s ON p.sale_id = s.id
      WHERE DATE(s.created_at) = ? AND s.status != 'held'
      GROUP BY p.method
    `, { replacements: [today], type: db.QueryTypes.SELECT }),

    db.query(`
      SELECT s.id, s.invoice_no, s.total, s.created_at, u.name as user_name
      FROM sales s JOIN users u ON s.user_id = u.id
      WHERE s.status != 'held' ORDER BY s.id DESC LIMIT 8
    `, { type: db.QueryTypes.SELECT }),

    db.query(`
      SELECT si.product_name, MAX(p.image) as image,
             ROUND(SUM(si.qty)) as total_qty, COUNT(DISTINCT s.id) as bill_count
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND s.status != 'held'
      GROUP BY si.product_name ORDER BY total_qty DESC LIMIT 8
    `, { type: db.QueryTypes.SELECT }),

    // Hourly sales — last 3 calendar days
    db.query(`
      SELECT DATE(created_at) as date, HOUR(created_at) as hour,
             SUM(total) as total, COUNT(*) as bills
      FROM sales
      WHERE status != 'held'
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
      GROUP BY DATE(created_at), HOUR(created_at)
      ORDER BY date, hour
    `, { type: db.QueryTypes.SELECT }),

    // Heatmap — daily totals last 10 weeks
    db.query(`
      SELECT DATE(created_at) as date, SUM(total) as total, COUNT(*) as bills
      FROM sales
      WHERE status != 'held'
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 70 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, { type: db.QueryTypes.SELECT }),
  ]);

  res.json({
    todaySales:     parseFloat(todaySales || 0),
    todayBills:     todayBills || 0,
    monthSales:     parseFloat(monthSales || 0),
    monthBills:     monthBills || 0,
    totalProducts,
    lowStockCount,
    todayByPayment,
    recentSales,
    fastMoving,
    hourlySales,
    heatmap,
  });
});

module.exports = router;
