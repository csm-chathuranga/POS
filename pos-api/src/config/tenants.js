// Port of config/tenants.php — maps each subdomain to its MySQL database
module.exports = {
  'lover-kahatagasdigiliya.lumac.cc': {
    database: 'lover_kahatagasdigiliya',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'chandana.lumac.cc': {
    database: 'chandana_super',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'hiruna-marketing.lumac.cc': {
    database: 'hiruna_marketing',
    username: 'pos_user',
    password: 'Pos@2026Strong',
  },
  'pos.lumac.cc': {
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
