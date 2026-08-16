// Port of config/tenants.php — maps each subdomain to its MySQL database
module.exports = {
  'chandana-pos.lumac.cc': {
    database: 'chandana_pos',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'ckd-pos.lumac.cc': {
    database: 'ckd_pos',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'kahatagasdigiliya-pos.lumac.cc': {
    database: 'kahatagasdigiliya_pos',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  localhost: {
   database: 'ckd',
    username: 'root',
    password: 'root',
    host: '127.0.0.1',
  },
  '127.0.0.1': {
    database: 'ckd',
    username: 'root',
    password: 'root',
    host: '127.0.0.1',
  },
};
