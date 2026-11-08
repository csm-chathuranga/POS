module.exports = {
  // ── Hikvision Scanner ──────────────────────────────────────────────────────
  device_ip:   '192.168.100.2',   // scanner IP address
  device_port: 80,                // HTTP port (default 80)
  username:    'admin',           // scanner username
  password:    'Csm@1993',                // scanner admin password

  // ── Cloud POS API ──────────────────────────────────────────────────────────
  api_base:  'https://mayon-pos.lumac.cc',
  api_email: 'admin',                  // your POS login email
  api_pass:  '123',                  // your POS login password

  // ── Sync Options ───────────────────────────────────────────────────────────
  initial_days_back: 30,          // how far back to fetch on first run
  interval_min:      5,           // sync interval in minutes (--loop mode)
};
