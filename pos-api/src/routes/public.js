const router = require('express').Router();

// GET /api/public/invoice/:invoice_no — no auth, returns basic sale info for customer receipt view
router.get('/invoice/:invoice_no', async (req, res) => {
  try {
    const { Sale, SaleItem, Payment, Customer, Setting } = req.models;
    const sale = await Sale.findOne({
      where: { invoice_no: req.params.invoice_no },
      include: [
        { model: SaleItem,  as: 'items' },
        { model: Payment,   as: 'payments' },
        { model: Customer,  as: 'customer', attributes: ['name', 'phone'] },
      ],
    });
    if (!sale) return res.status(404).json({ error: 'Invoice not found' });

    const shopName    = (await Setting.findOne({ where: { key: 'shop_name' } }))?.value || '';
    const address     = (await Setting.findOne({ where: { key: 'address' } }))?.value || '';
    const phone       = (await Setting.findOne({ where: { key: 'phone' } }))?.value || '';
    const shopLogo    = (await Setting.findOne({ where: { key: 'shop_logo' } }))?.value || '';
    const footer      = (await Setting.findOne({ where: { key: 'receipt_footer' } }))?.value || 'Thank you for your purchase!';

    res.json({
      invoice_no:    sale.invoice_no,
      created_at:    sale.createdAt,
      customer_name: sale.customer?.name || null,
      subtotal:      sale.subtotal,
      discount:      sale.discount,
      total:         sale.total,
      paid:          sale.paid,
      balance:       sale.balance,
      status:        sale.status,
      items:         sale.items,
      payments:      sale.payments,
      shop: { name: shopName, address, phone, logo: shopLogo, footer },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
