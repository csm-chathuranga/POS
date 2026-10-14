const MODULES = [
  {
    key: 'sms',
    label: 'SMS Receipts',
    description: 'Send SMS receipts to customers after each sale',
    insertsFeature: false,
  },
  {
    key: 'accounting',
    label: 'Accounting',
    description: 'Chart of accounts, journal entries and financial reports',
    insertsFeature: true,
    feature: {
      key: 'accounting',
      label: 'Accounting',
      path: '/accounting',
      group: 'finance',
      sort_order: 10,
      icon: 'calculator',
      offline_ok: false,
    },
  },
  {
    key: 'loading_sheet',
    label: 'Loading Sheet',
    description: 'Group sales into delivery loading sheets and mark them as delivered',
    insertsFeature: true,
    feature: {
      key: 'loading_sheet',
      label: 'Loading Sheets',
      path: '/loading-sheets',
      group: 'finance',
      sort_order: 20,
      icon: 'truck',
      offline_ok: false,
    },
  },
];

module.exports = MODULES;
