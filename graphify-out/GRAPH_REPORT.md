# Graph Report - POS  (2026-10-24)

## Corpus Check
- 173 files · ~207,250 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1089 nodes · 2037 edges · 101 communities (68 shown, 33 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.75)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1e6a7aa8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- react
- Modules.jsx
- dependencies
- baseApi.js
- dependencies
- Graphify Build Pipeline
- devDependencies
- useLocale
- ChartOfAccounts.jsx
- tenant.js
- Dashboard.jsx
- middleware/auth.js
- role.js
- products.js
- .oxlintrc.json
- useProductCache.js
- Icons SVG Sprite Sheet
- AppLayout.jsx
- selectToken
- add-supplier-credit.js
- index.jsx
- useConnectivity
- Electron Packaged App 404 Router Bug Fix
- customers.js
- LMUC POS
- settings.js
- Plan: Multi-Batch Support for Same-Barcode Items
- Settings.jsx
- POS Client HTML App Entry Point
- FalkorDB Graph Export
- Neo4j Graph Export
- Token Reduction Benchmark
- Cluster-Only Re-clustering (no re-extraction)
- helpers/accounting.js
- POS Application Favicon SVG Icon
- Hero Marketing Image (Isometric Layered Cards)
- React Logo SVG Asset
- Vite Logo SVG
- { useLoginMutation, useLogoutMutation, useMeQuery }
- electron/package.json
- authSlice.js
- add-tenant.js
- main.cjs
- electron/main.js
- tenants.js
- seed-accounts-all.js
- Create2 Offline Receipt Gap vs Create
- Home Button in POS Interface Headers
- Offline Navigation Locking Feature
- Tenant Management Externalization Plan (deferred)
- electron/main.js
- getMasterDb
- seed-accounts.js
- preload.cjs
- Electron/preload.js
- electron/preload.js
- loading-sheets/Show.jsx
- {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useSettleCreditMutation,
  useGetCreditHistoryQuery,
  useQuickAddCustomerMutation,
  useAdjustCreditMutation,
}
- {
  useGetReportTodayQuery,
  useGetReportDayEndQuery,
  useGetReportMonthlyQuery,
  useGetReportTopProductsQuery,
  useGetReportLowStockQuery,
  useGetReportProfitQuery,
  useGetReportCreditCustomersQuery,
  useGetReportStockSummaryQuery,
  useGetReportRevenueQuery,
  useGetReportStockMovementsQuery,
  useGetReportDailySalesQuery,
}
- add-product-batches.js
- seed-hardware.js
- seed-lover.js
- purchases/Show.jsx
- accountingApi.js
- migrate-accounting.js
- purchases/Create.jsx
- Create3.jsx
- invoices/Index.jsx
- migrate-loading-sheets.js
- migrate-purchase-returns.js
- admin-modules.js
- sales/Show.jsx
- setup-tenant.js
- routes/accounting.js
- loading-sheets.js
- purchases.js
- employees.js
- TrialBalance.jsx
- loading-sheets/Index.jsx
- LocaleContext.jsx
- {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useGetJournalQuery,
  useGetJournalEntryQuery,
  useCreateJournalEntryMutation,
  useGetTrialBalanceQuery,
  useGetProfitLossQuery,
  useGetCashbookQuery,
  useGetBalanceSheetQuery,
  useGetLedgerQuery,
  useGetExpensesQuery,
  useGetOpeningBalanceQuery,
  useSaveOpeningBalanceMutation,
}
- {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useImportCategoriesMutation,
  useTruncateCategoriesMutation,
}
- {
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetSalaryHistoryQuery,
  usePaySalaryMutation,
}
- { useGetExtensionsQuery, useSendSmsReceiptMutation }
- {
  useGetLoadingSheetsQuery,
  useGetLoadingSheetQuery,
  useGetAvailableSalesQuery,
  useCreateLoadingSheetMutation,
  useAddSaleToSheetMutation,
  useRemoveSaleFromSheetMutation,
  useDeliverSheetMutation,
  useDeleteLoadingSheetMutation,
}
- { useGetModulesQuery, useToggleModuleMutation }
- {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useImportProductsMutation,
  useTruncateProductsMutation,
  useIntakeLookupQuery,
  useLazyIntakeLookupQuery,
  useGetProductBatchesQuery,
  useCreateProductBatchMutation,
  useGetDiscountTiersQuery,
  useCreateDiscountTierMutation,
  useDeleteDiscountTierMutation,
}
- {
  useGetPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useDeletePurchaseMutation,
  useReturnPurchaseMutation,
}
- {
  useGetRolesQuery,
  useGetFeaturesQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
  useSetRoleFeaturesMutation,
}
- {
  useGetSalesQuery,
  useGetSaleQuery,
  useCreateSaleMutation,
  useHoldSaleMutation,
  useGetHeldSalesQuery,
  useDeleteSaleMutation,
  useReturnSaleMutation,
  useMarkSalePaidMutation,
  useGetDailySalesPrintQuery,
}
- {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSupplierCreditHistoryQuery,
  useSettleSupplierCreditMutation,
}
- {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetAllFeaturesQuery,
  useGetUserFeaturesQuery,
  useSetUserFeaturesMutation,
}
- suppliers/Credit.jsx
- reports.js
- invoices/Show.jsx
- JournalShow.jsx
- index.js

## God Nodes (most connected - your core abstractions)
1. `useLocale()` - 58 edges
2. `react` - 54 edges
3. `useConnectivity()` - 35 edges
4. `api` - 28 edges
5. `selectRole()` - 28 edges
6. `selectToken()` - 27 edges
7. `getApiUrl()` - 24 edges
8. `getMasterDb()` - 17 edges
9. `selectCurrentUser()` - 17 edges
10. `AppLayout()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `main()` --indirect_call--> `f()`  [INFERRED]
  pos-api/scripts/migrate.js → pos-client/src/pages/sales/DailyReport.jsx
- `ensureFeatures()` --indirect_call--> `f()`  [INFERRED]
  pos-api/src/routes/roles.js → pos-client/src/pages/sales/DailyReport.jsx
- `Project Graphify Knowledge Graph Config` --conceptually_related_to--> `Graphify Build Pipeline`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `Native CLAUDE.md Graphify Integration` --conceptually_related_to--> `Project Graphify Knowledge Graph Config`  [INFERRED]
  .claude/skills/graphify/references/hooks.md → CLAUDE.md
- `DailyConnectionGate()` --indirect_call--> `selectToken()`  [INFERRED]
  pos-client/src/components/DailyConnectionGate.jsx → pos-client/src/features/auth/authSlice.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Auto-Update System (hook, watch, incremental)** — _claude_skills_graphify_references_hooks_git_commit_hook, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_update_incremental_update [INFERRED 0.85]
- **Graphify Query Interface (BFS, DFS, Path, Explain)** — _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_dfs_traversal, _claude_skills_graphify_references_query_path_query, _claude_skills_graphify_references_query_explain_node [EXTRACTED 1.00]
- **Graphify Query Interface (BFS, DFS, Path, Explain)** — _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_dfs_traversal, _claude_skills_graphify_references_query_path_query, _claude_skills_graphify_references_query_explain_node [EXTRACTED 1.00]
- **Graphify Auto-Update System (hook, watch, incremental)** — _claude_skills_graphify_references_hooks_git_commit_hook, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_update_incremental_update [INFERRED 0.85]

## Communities (101 total, 33 thin omitted)

### Community 0 - "react"
Cohesion: 0.14
Nodes (9): UpdateBanner(), DayEndCreate(), fmt(), GROUP_LABEL, RolesPage(), fmt(), SupplierCreditIndex(), router (+1 more)

### Community 1 - "Modules.jsx"
Cohesion: 0.29
Nodes (3): modulesApi, MODULE_ICONS, ModulesPage()

### Community 2 - "dependencies"
Cohesion: 0.04
Nodes (46): axios, dexie, jsbarcode, build, appId, directories, files, nsis (+38 more)

### Community 3 - "baseApi.js"
Cohesion: 0.13
Nodes (12): api, baseQueryWithAuth(), rawBaseQuery, authApi, categoriesApi, customersApi, employeesApi, extensionsApi (+4 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (31): bcryptjs, cors, dotenv, express, express-validator, jsonwebtoken, mysql2, node-cache (+23 more)

### Community 5 - "Graphify Build Pipeline"
Cohesion: 0.09
Nodes (27): Graphify Skill Trigger Rule, Add URL Command, Watch Mode Auto-Rebuild, MCP Server for Agent Graph Access, Wiki Export (agent-crawlable index), Confidence Scoring Rubric (EXTRACTED/INFERRED/AMBIGUOUS), Extraction Subagent Prompt Template, Node ID Format Convention (full-path stem) (+19 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (31): autoprefixer, cross-env, jimp, oxlint, devDependencies, autoprefixer, cross-env, electron (+23 more)

### Community 7 - "useLocale"
Cohesion: 0.06
Nodes (59): useLocale(), translations, API, fmt(), fmtDate(), fmtTime(), SaleDetailModal(), fmt() (+51 more)

### Community 8 - "ChartOfAccounts.jsx"
Cohesion: 0.11
Nodes (23): BalanceSheetReport(), CashBookTab(), ChartOfAccounts(), empty, emptyEmp, ExpenseTab(), fmt(), fmtDate() (+15 more)

### Community 9 - "tenant.js"
Cohesion: 0.14
Nodes (17): app, cors, express, tenant, connectionCache, createConnection(), evictTenantDb(), getModels (+9 more)

### Community 10 - "Dashboard.jsx"
Cohesion: 0.06
Nodes (32): ThemeContext, ThemeProvider(), useTheme(), GuestLayout(), TAGLINES, TUTORIALS, BAR_COLORS, dashboardApi (+24 more)

### Community 12 - "middleware/auth.js"
Cohesion: 0.11
Nodes (13): jwt, auth, { Op, fn, col, literal }, router, auth, crypto, router, auth (+5 more)

### Community 13 - "role.js"
Cohesion: 0.10
Nodes (15): ROLE_ALIASES, auth, role, router, auth, role, router, auth (+7 more)

### Community 14 - "products.js"
Cohesion: 0.25
Nodes (6): auth, cache, NodeCache, { Op }, role, router

### Community 15 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 16 - "useProductCache.js"
Cohesion: 0.31
Nodes (7): store, salesApi, allApi, clearProductCache(), deductStockFromCache(), loadFromStorage(), restoreStockToCache()

### Community 17 - "Icons SVG Sprite Sheet"
Cohesion: 0.29
Nodes (7): Bluesky Social Icon, Discord Social Icon, Documentation Icon, GitHub Icon, Social / User Profile Icon, Icons SVG Sprite Sheet, X (Twitter) Social Icon

### Community 18 - "AppLayout.jsx"
Cohesion: 0.05
Nodes (61): ConfirmModal(), DailyConnectionGate(), InstallPWA(), API, fmt(), NotificationDrawer(), timeAgo(), useNotifBadge() (+53 more)

### Community 19 - "selectToken"
Cohesion: 0.12
Nodes (10): selectToken(), ADMIN_FIELDS, API, DEFAULT, EDIT_FIELDS, ProvisionTenant(), TENANT_FIELDS, API (+2 more)

### Community 20 - "add-supplier-credit.js"
Cohesion: 0.07
Nodes (33): columnExists(), fail(), FEATURE, info(), isDry, main(), migrateTenant(), ok() (+25 more)

### Community 21 - "index.jsx"
Cohesion: 0.15
Nodes (17): selectFeatures(), selectRole(), AppLayout(), CashierLayout(), ImportDataPage(), CreditIndex(), fmt(), Dashboard() (+9 more)

### Community 22 - "useConnectivity"
Cohesion: 0.14
Nodes (16): API, ProductForm(), UNITS, API, ConnectivityContext, ConnectivityProvider(), pingServer(), useConnectivity() (+8 more)

### Community 24 - "customers.js"
Cohesion: 0.33
Nodes (4): auth, { Op }, { postCreditSettle, postCreditAdjustment }, router

### Community 25 - "LMUC POS"
Cohesion: 0.09
Nodes (21): Adding a new tenant (full setup), API, API (`pos-api/`), Available Scripts, Client, Client (`pos-client/`), Development Setup, Electron (desktop) (+13 more)

### Community 26 - "settings.js"
Cohesion: 0.40
Nodes (4): auth, role, router, { spawn }

### Community 27 - "Plan: Multi-Batch Support for Same-Barcode Items"
Cohesion: 0.11
Nodes (18): 1. Intake Page — receiving new stock, 2. POS Scan — selling, 3. Stock Deduction at Sale, Approach: Add a `product_batches` Table, Backend (`pos-api`), Decision Needed Before Starting, Edge Cases to Handle, File-by-File Changes (+10 more)

### Community 28 - "Settings.jsx"
Cohesion: 0.22
Nodes (6): LANGS, PRIMARY_COLORS, Settings(), settingsApi, SIDEBAR_THEMES, TABS

### Community 34 - "helpers/accounting.js"
Cohesion: 0.40
Nodes (16): byCode(), createEntry(), isEnabled(), nextRef(), { Op }, PAYMENT_METHOD_ACCOUNT, postCreditAdjustment(), postCreditSettle() (+8 more)

### Community 41 - "electron/package.json"
Cohesion: 0.11
Nodes (18): author, dependencies, electron-updater, description, devDependencies, electron, electron-builder, electron (+10 more)

### Community 42 - "authSlice.js"
Cohesion: 0.18
Nodes (13): authSlice, selectAllFeatures(), selectCurrentUser(), stored, API, DailyReport(), f(), fd() (+5 more)

### Community 43 - "add-tenant.js"
Cohesion: 0.21
Nodes (13): ask(), bcrypt, err(), fs, getModels, log(), main(), path (+5 more)

### Community 44 - "main.cjs"
Cohesion: 0.15
Nodes (7): { app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }, createMainWindow(), DEFAULT_CONFIG, fs, getConfigPath(), path, readPrinterConfig()

### Community 45 - "electron/main.js"
Cohesion: 0.15
Nodes (10): { autoUpdater }, { app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }, createMainWindow(), DEFAULT_CONFIG, devLog(), finish(), fs, getConfigPath() (+2 more)

### Community 46 - "tenants.js"
Cohesion: 0.14
Nodes (11): fs, MIGRATIONS_DIR, path, auth, bcrypt, { bustCache }, { getMasterDb }, getModels (+3 more)

### Community 47 - "seed-accounts-all.js"
Cohesion: 0.26
Nodes (10): ACCOUNTS, fail(), { getMasterDb }, getModels, head(), ok(), run(), seedTenant() (+2 more)

### Community 54 - "electron/main.js"
Cohesion: 0.27
Nodes (9): buildAppMenu(), buildSettingsOverlayScript(), createWindow(), DEFAULT_CONFIG, getConfigPath(), openSettingsOverlay(), readConfig(), resolvePreloadPath() (+1 more)

### Community 55 - "getMasterDb"
Cohesion: 0.19
Nodes (14): fail(), { getMasterDb }, head(), migrateTenant(), ok(), run(), { Sequelize }, { getMasterDb } (+6 more)

### Community 56 - "seed-accounts.js"
Cohesion: 0.27
Nodes (9): ACCOUNTS, { getMasterDb }, getModels, info(), ok(), resolveTenantConfig(), run(), { Sequelize } (+1 more)

### Community 60 - "loading-sheets/Show.jsx"
Cohesion: 0.29
Nodes (9): emptyLine(), JournalCreate(), today(), toNum(), fmt(), fmtDate(), fmtDateTime(), LoadingSheetShow() (+1 more)

### Community 63 - "add-product-batches.js"
Cohesion: 0.36
Nodes (9): fail(), info(), isDry, main(), migrateTenant(), ok(), { Sequelize }, skip() (+1 more)

### Community 65 - "seed-hardware.js"
Cohesion: 0.29
Nodes (9): CATEGORIES, clear, getModels, log(), main(), PRODUCTS, { Sequelize }, tenants (+1 more)

### Community 66 - "seed-lover.js"
Cohesion: 0.29
Nodes (9): CATEGORIES, clear, getModels, log(), main(), PRODUCTS, { Sequelize }, tenants (+1 more)

### Community 67 - "purchases/Show.jsx"
Cohesion: 0.48
Nodes (5): fmt(), fmtDate(), fmtNum(), PurchaseShow(), statusBadge()

### Community 68 - "accountingApi.js"
Cohesion: 0.27
Nodes (8): accountingApi, fmt(), fmtDate(), Journal(), fmt(), monthStart(), ProfitLoss(), today()

### Community 69 - "migrate-accounting.js"
Cohesion: 0.39
Nodes (8): fail(), { getMasterDb }, getModels, head(), migrateTenant(), ok(), run(), { Sequelize }

### Community 70 - "purchases/Create.jsx"
Cohesion: 0.25
Nodes (5): purchasesApi, suppliersApi, PurchaseCreate(), searchApi, today()

### Community 71 - "Create3.jsx"
Cohesion: 0.33
Nodes (8): useProductCache(), DARK, fmt(), getPrice(), LIGHT, posApi, recalc(), SalesCreate3()

### Community 72 - "invoices/Index.jsx"
Cohesion: 0.31
Nodes (6): fmt(), fmtDate(), fmtTime(), InvoicesIndex(), METHOD_CLS, STATUS_CLS

### Community 73 - "migrate-loading-sheets.js"
Cohesion: 0.43
Nodes (7): fail(), { getMasterDb }, head(), migrateTenant(), ok(), run(), { Sequelize }

### Community 74 - "migrate-purchase-returns.js"
Cohesion: 0.43
Nodes (7): fail(), { getMasterDb }, head(), migrateTenant(), ok(), run(), { Sequelize }

### Community 75 - "admin-modules.js"
Cohesion: 0.29
Nodes (5): MODULES, auth, MODULES, role, router

### Community 76 - "sales/Show.jsx"
Cohesion: 0.43
Nodes (5): API, fmt(), fmtDate(), fmtTime(), SaleShow()

### Community 77 - "setup-tenant.js"
Cohesion: 0.40
Nodes (5): bcrypt, getModels, run(), { Sequelize }, tenants

### Community 78 - "routes/accounting.js"
Cohesion: 0.33
Nodes (3): auth, { Op }, router

### Community 79 - "loading-sheets.js"
Cohesion: 0.33
Nodes (3): auth, { Op }, router

### Community 80 - "purchases.js"
Cohesion: 0.33
Nodes (5): auth, { Op }, { postPurchase, postPurchaseReturn }, role, router

### Community 81 - "employees.js"
Cohesion: 0.40
Nodes (4): auth, { postSalaryPayment }, role, router

### Community 83 - "TrialBalance.jsx"
Cohesion: 0.50
Nodes (4): fmt(), GROUPS, TrialBalance(), TYPE_COLORS

### Community 84 - "loading-sheets/Index.jsx"
Cohesion: 0.60
Nodes (4): CreateModal(), fmt(), fmtDate(), LoadingSheetsIndex()

### Community 86 - "LocaleContext.jsx"
Cohesion: 0.23
Nodes (12): getApiUrl(), getStoredLocale(), LocaleContext, LocaleProvider(), LOCALES, API, settingsApi, API (+4 more)

### Community 100 - "suppliers/Credit.jsx"
Cohesion: 0.60
Nodes (5): API, fmt(), fmtDate(), printPaymentReceipt(), SupplierCredit()

### Community 101 - "reports.js"
Cohesion: 0.40
Nodes (3): auth, { Op }, router

### Community 103 - "invoices/Show.jsx"
Cohesion: 0.60
Nodes (4): fmt(), fmtDate(), InvoiceShow(), settingsApi

### Community 104 - "JournalShow.jsx"
Cohesion: 0.83
Nodes (3): fmt(), fmtDate(), JournalShow()

## Knowledge Gaps
- **400 isolated node(s):** `{ app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }`, `path`, `fs`, `DEFAULT_CONFIG`, `{ app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }` (+395 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `f()` connect `authSlice.js` to `react`, `add-supplier-credit.js`, `index.jsx`?**
  _High betweenness centrality (0.252) - this node is a cross-community bridge._
- **Why does `main()` connect `add-supplier-credit.js` to `authSlice.js`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `ensureFeatures()` connect `add-supplier-credit.js` to `authSlice.js`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `selectRole()` (e.g. with `AppLayout()` and `CashierLayout()`) actually correct?**
  _`selectRole()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }`, `path`, `fs` to the rest of the system?**
  _400 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._