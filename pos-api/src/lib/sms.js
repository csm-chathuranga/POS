const https = require('https');
const http  = require('http');

// SMSlenz API — POST https://smslenz.lk/api/send-sms
// Fields: user_id, api_key, sender_id, contact, message
const SMSGENZ_URL = 'https://smslenz.lk/api/send-sms';

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function httpPost(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const body = JSON.stringify(payload);
    const lib  = url.protocol === 'https:' ? https : http;
    const req  = lib.request(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Creates SMS tables in the tenant DB. Safe to re-run.
async function ensureSmsTables(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`sms_config\` (
      \`id\`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`user_id\`          VARCHAR(191)    NOT NULL DEFAULT '',
      \`api_key\`          VARCHAR(191)    NOT NULL DEFAULT '',
      \`sender_id\`        VARCHAR(50)     NOT NULL DEFAULT '',
      \`receipt_template\` TEXT            NOT NULL,
      \`updated_at\`       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`sms_logs\` (
      \`id\`       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`sale_id\`  BIGINT UNSIGNED NULL,
      \`phone\`    VARCHAR(50)     NOT NULL,
      \`message\`  TEXT            NOT NULL,
      \`status\`   ENUM('sent','failed') NOT NULL,
      \`error\`    TEXT            NULL,
      \`sent_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  // Seed default template row if table is empty
  await sequelize.query(`
    INSERT INTO \`sms_config\` (\`id\`, \`user_id\`, \`api_key\`, \`sender_id\`, \`receipt_template\`)
    SELECT 1, '', '', '', 'Dear {customer}, your receipt {invoice_no} total Rs. {total} has been processed. Thank you!'
    WHERE NOT EXISTS (SELECT 1 FROM \`sms_config\` LIMIT 1);
  `);
}

async function getConfig(models) {
  if (!models.SmsConfig) return null;
  return models.SmsConfig.findOne();
}

// Sends an SMS via SMSlenz. Returns { ok: bool, error: string|null }.
async function sendSms(cfg, phone, message) {
  try {
    const { status, body } = await httpPost(SMSGENZ_URL, {
      user_id:   cfg.user_id,
      api_key:   cfg.api_key,
      sender_id: cfg.sender_id,
      contact:   phone,
      message,
    });
    // SMSlenz returns 200 with a JSON body; check for error in body too
    let parsed = null;
    try { parsed = JSON.parse(body); } catch {}
    const ok = status >= 200 && status < 300 && parsed?.status !== 'error';
    return { ok, error: ok ? null : (parsed?.message || `HTTP ${status}: ${body}`) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Fire-and-forget: called from sales route after sale commits.
// Never throws — result is logged to sms_logs.
async function fireSmsReceipt(models, db, sale, customerId) {
  try {
    const enabled = await models.Setting.findOne({ where: { key: 'module.sms.enabled' } });
    if (enabled?.value !== 'true') return;

    const cfg = await getConfig(models);
    if (!cfg || !cfg.user_id) return;

    // Resolve phone from customer or sale
    let phone = sale.customer?.phone || null;
    if (!phone && customerId) {
      const customer = await models.Customer.findByPk(customerId, { attributes: ['phone'] });
      phone = customer?.phone || null;
    }
    if (!phone) return;

    // Resolve store name from settings
    const storeRow = await models.Setting.findOne({ where: { key: 'store_name' } });
    const storeName = storeRow?.value || 'Store';
    const customerName = sale.customer?.name || 'Customer';

    const message = interpolate(cfg.receipt_template, {
      customer:   customerName,
      invoice_no: sale.invoice_no,
      total:      parseFloat(sale.total).toFixed(2),
      date:       new Date(sale.created_at || Date.now()).toLocaleDateString(),
      store_name: storeName,
    });

    const { ok, error } = await sendSms(cfg, phone, message);
    await models.SmsLog.create({
      sale_id: sale.id,
      phone,
      message,
      status:  ok ? 'sent' : 'failed',
      error:   error || null,
    });
  } catch { /* silent */ }
}

module.exports = { ensureSmsTables, getConfig, sendSms, fireSmsReceipt, interpolate };
