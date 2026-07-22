// Port of config/tenants.php — maps each subdomain to its MySQL database
module.exports = {
  'kahatagasdigiliya-pos.lumac.cc': {
    database: 'ranali',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'chandana-pos.lumac.cc': {
    database: 'ranali',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'hiruna-pos.lumac.cc': {
    database: 'hiruna_marketing',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'pos-pos.lumac.cc': {
    database: 'senewirathna_super',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  localhost: {
    database: 'ranali',
    username: 'pos_user',
    password: 'Pos@2026Strong',
    host: '127.0.0.1',
  },
  '127.0.0.1': {
    database: 'ranali',
    username: 'pos_user',
    password: 'Pos@2026Strong',
    host: '127.0.0.1',
  },
};
