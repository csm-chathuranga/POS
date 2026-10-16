const { DataTypes } = require('sequelize');

function getModels(sequelize) {
  const User = sequelize.define('User', {
    id:       { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name:     { type: DataTypes.STRING(191), allowNull: false },
    email:    { type: DataTypes.STRING(191), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(191), allowNull: false },
  }, { tableName: 'users' });

  const Role = sequelize.define('Role', {
    id:   { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(191), allowNull: false },
  }, { tableName: 'roles', timestamps: false });

  const Category = sequelize.define('Category', {
    id:     { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name:   { type: DataTypes.STRING(191), allowNull: false },
    image:  { type: DataTypes.STRING(512), allowNull: true },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'categories' });

  const Product = sequelize.define('Product', {
    id:             { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    category_id:    { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    name:           { type: DataTypes.STRING(191), allowNull: false },
    name_si:        { type: DataTypes.STRING(191), allowNull: true },
    barcode:        { type: DataTypes.STRING(191), allowNull: true },
    sku:            { type: DataTypes.STRING(191), allowNull: true },
    description:    { type: DataTypes.TEXT, allowNull: true },
    image:          { type: DataTypes.STRING(512), allowNull: true },
    cost_price:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    selling_price:  { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    wholesale_price:{ type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    promo_price:    { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    promo_start_date:{ type: DataTypes.DATEONLY, allowNull: true },
    promo_end_date: { type: DataTypes.DATEONLY, allowNull: true },
    our_price:      { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    expiry_date:    { type: DataTypes.DATEONLY, allowNull: true },
    stock_qty:      { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    alert_qty:      { type: DataTypes.DECIMAL(10, 3), defaultValue: 5 },
    unit:           { type: DataTypes.STRING(191), defaultValue: 'pcs' },
    active:         { type: DataTypes.BOOLEAN, defaultValue: true },
    is_fast_moving: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'products' });

  const ProductVariant = sequelize.define('ProductVariant', {
    id:                { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id:        { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    label:             { type: DataTypes.STRING(191), allowNull: false },
    barcode:           { type: DataTypes.STRING(191), allowNull: true },
    cost_price:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    selling_price:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    wholesale_price:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    stock_qty:         { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    alert_qty:         { type: DataTypes.DECIMAL(10, 3), defaultValue: 5 },
    conversion_factor: { type: DataTypes.DECIMAL(10, 6), defaultValue: 1 },
  }, { tableName: 'product_variants' });

  const Supplier = sequelize.define('Supplier', {
    id:              { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name:            { type: DataTypes.STRING(191), allowNull: false },
    phone:           { type: DataTypes.STRING(191), allowNull: true },
    email:           { type: DataTypes.STRING(191), allowNull: true },
    address:         { type: DataTypes.TEXT, allowNull: true },
    active:          { type: DataTypes.BOOLEAN, defaultValue: true },
    payable_balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  }, { tableName: 'suppliers' });

  const SupplierPayment = sequelize.define('SupplierPayment', {
    id:          { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    ref_no:      { type: DataTypes.STRING(191), allowNull: true, unique: true },
    supplier_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    amount:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    note:        { type: DataTypes.STRING(191), allowNull: true },
  }, { tableName: 'supplier_payments' });

  const Customer = sequelize.define('Customer', {
    id:             { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name:           { type: DataTypes.STRING(191), allowNull: false },
    phone:          { type: DataTypes.STRING(191), allowNull: true },
    email:          { type: DataTypes.STRING(191), allowNull: true },
    address:        { type: DataTypes.TEXT, allowNull: true },
    credit_limit:   { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    credit_balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    active:         { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'customers' });

  const Sale = sequelize.define('Sale', {
    id:           { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    invoice_no:   { type: DataTypes.STRING(191), allowNull: false, unique: true },
    client_id:    { type: DataTypes.STRING(50), allowNull: true, unique: true },
    user_id:      { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    customer_id:  { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    subtotal:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    tax:          { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    extra_charges:{ type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total:        { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    paid:         { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    balance:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status:       { type: DataTypes.ENUM('completed', 'held', 'returned'), defaultValue: 'completed' },
    note:         { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'sales' });

  const SaleItem = sequelize.define('SaleItem', {
    id:             { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    sale_id:        { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    product_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    variant_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    product_name:   { type: DataTypes.STRING(191), allowNull: false },
    unit_price:     { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    original_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cost_price:     { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    qty:            { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    discount:       { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, { tableName: 'sale_items' });

  const Payment = sequelize.define('Payment', {
    id:        { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    sale_id:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    method:    { type: DataTypes.ENUM('cash', 'card', 'qr', 'credit'), defaultValue: 'cash' },
    amount:    { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    reference: { type: DataTypes.STRING(191), allowNull: true },
  }, { tableName: 'payments' });

  const SaleReturn = sequelize.define('SaleReturn', {
    id:        { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    sale_id:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    return_no: { type: DataTypes.STRING(191), allowNull: false, unique: true },
    reason:    { type: DataTypes.TEXT, allowNull: true },
    total:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    items:     { type: DataTypes.JSON, allowNull: false },
  }, { tableName: 'sale_returns' });

  const PurchaseReturn = sequelize.define('PurchaseReturn', {
    id:          { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    purchase_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    return_no:   { type: DataTypes.STRING(191), allowNull: false, unique: true },
    reason:      { type: DataTypes.TEXT, allowNull: true },
    total:       { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    items:       { type: DataTypes.JSON, allowNull: false },
  }, { tableName: 'purchase_returns' });

  const Purchase = sequelize.define('Purchase', {
    id:            { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    grn_no:        { type: DataTypes.STRING(191), allowNull: false, unique: true },
    supplier_id:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    user_id:       { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    subtotal:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    discount:      { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    total:         { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    paid:          { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status:        { type: DataTypes.ENUM('received', 'pending', 'partial'), defaultValue: 'received' },
    purchase_date: { type: DataTypes.DATEONLY, allowNull: false },
    due_date:      { type: DataTypes.DATEONLY, allowNull: true },
    note:          { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'purchases' });

  const PurchaseItem = sequelize.define('PurchaseItem', {
    id:           { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    purchase_id:  { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    product_id:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    product_name: { type: DataTypes.STRING(191), allowNull: false },
    qty:          { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    cost_price:   { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    total:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, { tableName: 'purchase_items' });

  const StockMovement = sequelize.define('StockMovement', {
    id:           { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id:      { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    type:         { type: DataTypes.ENUM('in', 'out', 'adjustment', 'return'), allowNull: false },
    qty:          { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    stock_before: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    stock_after:  { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    reference:    { type: DataTypes.STRING(191), allowNull: true },
    note:         { type: DataTypes.TEXT, allowNull: true },
  }, { tableName: 'stock_movements' });

  const CreditPayment = sequelize.define('CreditPayment', {
    id:          { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    invoice_no:  { type: DataTypes.STRING(191), allowNull: true, unique: true },
    customer_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    amount:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    note:        { type: DataTypes.STRING(191), allowNull: true },
  }, { tableName: 'credit_payments' });

  const Setting = sequelize.define('Setting', {
    id:    { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    key:   { type: DataTypes.STRING(191), allowNull: false, unique: true },
    value: { type: DataTypes.TEXT('long'), allowNull: true },
  }, { tableName: 'settings' });

  const ProductBatch = sequelize.define('ProductBatch', {
    id:            { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id:    { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    batch_label:   { type: DataTypes.STRING(100), allowNull: true },
    qty:           { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
    cost_price:    { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    selling_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    expiry_date:   { type: DataTypes.DATEONLY, allowNull: true },
    received_at:   { type: DataTypes.DATEONLY, allowNull: false },
  }, { tableName: 'product_batches', underscored: true });

  const ProductDiscountTier = sequelize.define('ProductDiscountTier', {
    id:         { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    min_qty:    { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    discount:   { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  }, { tableName: 'product_discount_tiers', underscored: true });

  const Account = sequelize.define('Account', {
    id:        { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    code:      { type: DataTypes.STRING(20), allowNull: false, unique: true },
    name:      { type: DataTypes.STRING(191), allowNull: false },
    type:      { type: DataTypes.ENUM('asset', 'liability', 'equity', 'income', 'expense'), allowNull: false },
    parent_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, { tableName: 'accounts', timestamps: false });

  const JournalEntry = sequelize.define('JournalEntry', {
    id:          { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    ref_no:      { type: DataTypes.STRING(20), allowNull: false, unique: true },
    date:        { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    user_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  }, { tableName: 'journal_entries' });

  const JournalLine = sequelize.define('JournalLine', {
    id:         { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    entry_id:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    account_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    debit:      { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    credit:     { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    note:       { type: DataTypes.STRING(191), allowNull: true },
  }, { tableName: 'journal_lines', timestamps: false });

  const Feature = sequelize.define('Feature', {
    id:         { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    key:        { type: DataTypes.STRING(191), allowNull: false, unique: true },
    label:      { type: DataTypes.STRING(191), allowNull: false },
    path:       { type: DataTypes.STRING(191), allowNull: true },
    group:      { type: DataTypes.STRING(50), allowNull: true },
    sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    icon:       { type: DataTypes.STRING(32), allowNull: true },
    offline_ok: { type: DataTypes.BOOLEAN, defaultValue: false },
  }, { tableName: 'features', timestamps: false });

  const Employee = sequelize.define('Employee', {
    id:           { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name:         { type: DataTypes.STRING(191), allowNull: false },
    position:     { type: DataTypes.STRING(191), allowNull: true },
    phone:        { type: DataTypes.STRING(50),  allowNull: true },
    address:      { type: DataTypes.TEXT,        allowNull: true },
    basic_salary: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    hired_date:   { type: DataTypes.DATEONLY,    allowNull: true },
    active:       { type: DataTypes.BOOLEAN,     defaultValue: true },
  }, { tableName: 'employees' });

  const SalaryPayment = sequelize.define('SalaryPayment', {
    id:          { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    ref_no:      { type: DataTypes.STRING(191), allowNull: true, unique: true },
    employee_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id:     { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    period:      { type: DataTypes.STRING(20),  allowNull: false }, // e.g. "2024-10"
    amount:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    note:        { type: DataTypes.STRING(191), allowNull: true },
  }, { tableName: 'salary_payments' });

  const LoadingSheet = sequelize.define('LoadingSheet', {
    id:           { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    sheet_no:     { type: DataTypes.STRING(50), allowNull: false, unique: true },
    date:         { type: DataTypes.DATEONLY, allowNull: false },
    note:         { type: DataTypes.TEXT, allowNull: true },
    status:       { type: DataTypes.ENUM('open', 'delivered'), defaultValue: 'open' },
    delivered_at: { type: DataTypes.DATE, allowNull: true },
    created_by:   { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  }, { tableName: 'loading_sheets', underscored: true });

  const LoadingSheetItem = sequelize.define('LoadingSheetItem', {
    id:       { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    sheet_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    sale_id:  { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  }, { tableName: 'loading_sheet_items', underscored: true, updatedAt: false });

  // ── Associations ────────────────────────────────────────────────────────────
  User.belongsToMany(Role, { through: 'user_role', foreignKey: 'user_id', otherKey: 'role_id', timestamps: false });
  Role.belongsToMany(User, { through: 'user_role', foreignKey: 'role_id', otherKey: 'user_id', timestamps: false });

  Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
  Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
  ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
  Product.hasMany(ProductBatch, { foreignKey: 'product_id', as: 'batches' });
  ProductBatch.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  Product.hasMany(ProductDiscountTier, { foreignKey: 'product_id', as: 'discountTiers' });
  ProductDiscountTier.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Sale.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
  Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items' });
  Sale.hasMany(Payment, { foreignKey: 'sale_id', as: 'payments' });
  SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
  Purchase.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items' });
  Purchase.hasMany(PurchaseReturn, { foreignKey: 'purchase_id', as: 'returns' });

  Supplier.hasMany(SupplierPayment, { foreignKey: 'supplier_id', as: 'payments' });
  SupplierPayment.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
  SupplierPayment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  Customer.hasMany(CreditPayment, { foreignKey: 'customer_id', as: 'creditPayments' });
  Customer.hasMany(Sale, { foreignKey: 'customer_id', as: 'sales' });
  CreditPayment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  Account.hasMany(JournalLine, { foreignKey: 'account_id', as: 'lines' });
  JournalLine.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

  JournalEntry.hasMany(JournalLine, { foreignKey: 'entry_id', as: 'lines' });
  JournalLine.belongsTo(JournalEntry, { foreignKey: 'entry_id', as: 'entry' });

  JournalEntry.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  Account.belongsTo(Account, { foreignKey: 'parent_id', as: 'parent' });
  Account.hasMany(Account, { foreignKey: 'parent_id', as: 'children' });

  Role.belongsToMany(Feature, { through: 'role_features', foreignKey: 'role_id', otherKey: 'feature_id', timestamps: false });
  Feature.belongsToMany(Role, { through: 'role_features', foreignKey: 'feature_id', otherKey: 'role_id', timestamps: false });

  // Per-user feature overrides (takes precedence over role features when set)
  User.belongsToMany(Feature, { through: 'user_features', foreignKey: 'user_id', otherKey: 'feature_id', as: 'DirectFeatures', timestamps: false });
  Feature.belongsToMany(User, { through: 'user_features', foreignKey: 'feature_id', otherKey: 'user_id', as: 'DirectUsers', timestamps: false });

  Employee.hasMany(SalaryPayment, { foreignKey: 'employee_id', as: 'salaryPayments' });
  SalaryPayment.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
  SalaryPayment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  LoadingSheet.hasMany(LoadingSheetItem, { foreignKey: 'sheet_id', as: 'items' });
  LoadingSheetItem.belongsTo(LoadingSheet, { foreignKey: 'sheet_id', as: 'sheet' });
  LoadingSheetItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
  Sale.hasMany(LoadingSheetItem, { foreignKey: 'sale_id', as: 'loadingItems' });
  LoadingSheet.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });

  return {
    User, Role, Category, Product, ProductVariant, ProductBatch, ProductDiscountTier,
    Supplier, Customer, Sale, SaleItem, Payment, SaleReturn,
    Purchase, PurchaseItem, PurchaseReturn, StockMovement, CreditPayment, SupplierPayment, Setting, Feature,
    Account, JournalEntry, JournalLine,
    Employee, SalaryPayment,
    LoadingSheet, LoadingSheetItem,
  };
}

module.exports = getModels;
