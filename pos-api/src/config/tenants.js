// Port of config/tenants.php — maps each subdomain to its MySQL database
module.exports = {
  'chandana-pos.lumac.cc': {
    database: 'chandana_pos',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'retail-pos.lumac.cc': {
    database: 'retail_pos',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  localhost: {
   database: 'chandana_pos',
    username: 'root',
    password: 'root',
    host: '127.0.0.1',
  },
  '127.0.0.1': {
    database: 'chandana_pos',
    username: 'root',
    password: 'root',
    host: '127.0.0.1',
  },
};
