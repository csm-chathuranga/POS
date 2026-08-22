# Graph Report - POS-sinhala  (2026-08-22)

## Corpus Check
- 115 files · ~90,136 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 711 nodes · 1300 edges · 65 communities (39 shown, 26 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8edac62a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AppLayout.jsx
- index.jsx
- pos-client/package.json
- baseApi.js
- dependencies
- Graphify Build Pipeline
- devDependencies
- useLocale
- Settings.jsx
- add-tenant.js
- Dashboard.jsx
- sales/Create.jsx
- middleware/auth.js
- role.js
- products.js
- .oxlintrc.json
- cacheSync.js
- Icons SVG Sprite Sheet
- offlineQueue.js
- sales.js
- routes/auth.js
- reports.js
- users.js
- Electron Builder NSIS Installer Config
- customers.js
- LMUC POS
- settings.js
- suppliers.js
- Electron Builder Config
- POS Client HTML App Entry Point
- FalkorDB Graph Export
- Neo4j Graph Export
- Token Reduction Benchmark
- Cluster-Only Re-clustering (no re-extraction)
- POS Application Favicon SVG Icon
- Hero Marketing Image (Isometric Layered Cards)
- React Logo SVG Asset
- Vite Logo SVG
- { useLoginMutation, useLogoutMutation, useMeQuery }
- Electron/package.json
- {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useImportProductsMutation,
}
- {
  useGetPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useDeletePurchaseMutation,
}
- main.cjs
- Electron/main.js
- {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
}
- {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
}
- Create2 Offline Receipt Gap vs Create
- Home Button in POS Interface Headers
- Offline Navigation Locking Feature
- Tenant Management Externalization Plan (deferred)
- electron/main.js
- roles.js
- imagekit.js
- preload.cjs
- Electron/preload.js
- electron/preload.js
- {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
}
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
- {
  useGetRolesQuery,
  useGetFeaturesQuery,
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
}

## God Nodes (most connected - your core abstractions)
1. `useLocale()` - 55 edges
2. `react` - 37 edges
3. `useConnectivity()` - 33 edges
4. `api` - 22 edges
5. `selectRole()` - 22 edges
6. `selectToken()` - 21 edges
7. `getApiUrl()` - 16 edges
8. `Graphify Build Pipeline` - 15 edges
9. `AppLayout()` - 14 edges
10. `selectCurrentUser()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Project Graphify Knowledge Graph Config` --conceptually_related_to--> `Graphify Build Pipeline`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `ProtectedRoute()` --indirect_call--> `selectToken()`  [INFERRED]
  pos-client/src/router/index.jsx → pos-client/src/features/auth/authSlice.js
- `Native CLAUDE.md Graphify Integration` --conceptually_related_to--> `Project Graphify Knowledge Graph Config`  [INFERRED]
  .claude/skills/graphify/references/hooks.md → CLAUDE.md
- `Electron Builder NSIS Installer Config` --conceptually_related_to--> `Electron Packaged App 404 Router Bug Fix`  [INFERRED]
  pos-client/release/builder-debug.yml → summaries/2026-07-31-session-summary.md
- `NotificationDrawer()` --indirect_call--> `selectToken()`  [INFERRED]
  pos-client/src/components/NotificationDrawer.jsx → pos-client/src/features/auth/authSlice.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Auto-Update System (hook, watch, incremental)** — _claude_skills_graphify_references_hooks_git_commit_hook, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_update_incremental_update [INFERRED 0.85]
- **Graphify Query Interface (BFS, DFS, Path, Explain)** — _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_dfs_traversal, _claude_skills_graphify_references_query_path_query, _claude_skills_graphify_references_query_explain_node [EXTRACTED 1.00]
- **Electron POS Packaging and Distribution System** — pos_client_release_builder_debug_electron_builder_config, summaries_2026_07_31_session_summary_electron_404_bug_fix, pos_client_index_pos_client_app_entry [INFERRED 0.75]
- **Graphify Query Interface (BFS, DFS, Path, Explain)** — _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_dfs_traversal, _claude_skills_graphify_references_query_path_query, _claude_skills_graphify_references_query_explain_node [EXTRACTED 1.00]
- **Graphify Auto-Update System (hook, watch, incremental)** — _claude_skills_graphify_references_hooks_git_commit_hook, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_update_incremental_update [INFERRED 0.85]
- **Electron POS Packaging and Distribution System** — pos_client_release_builder_debug_electron_builder_config, summaries_2026_07_31_session_summary_electron_404_bug_fix, pos_client_index_pos_client_app_entry [INFERRED 0.75]

## Communities (65 total, 26 thin omitted)

### Community 0 - "AppLayout.jsx"
Cohesion: 0.11
Nodes (25): API, fmt(), NotificationDrawer(), timeAgo(), useNotifBadge(), buildPrintHtml(), fmt(), fmtDateTime() (+17 more)

### Community 1 - "index.jsx"
Cohesion: 0.05
Nodes (49): getStoredLocale(), LocaleContext, LocaleProvider(), LOCALES, ThemeContext, ThemeProvider(), authSlice, selectCurrentUser() (+41 more)

### Community 2 - "pos-client/package.json"
Cohesion: 0.04
Nodes (44): axios, dexie, build, appId, directories, files, nsis, productName (+36 more)

### Community 3 - "baseApi.js"
Cohesion: 0.06
Nodes (37): api, baseQueryWithAuth(), rawBaseQuery, store, getApiUrl(), authApi, categoriesApi, customersApi (+29 more)

### Community 4 - "dependencies"
Cohesion: 0.06
Nodes (31): bcryptjs, cors, dotenv, express, express-validator, jsonwebtoken, mysql2, node-cache (+23 more)

### Community 5 - "Graphify Build Pipeline"
Cohesion: 0.09
Nodes (27): Graphify Skill Trigger Rule, Add URL Command, Watch Mode Auto-Rebuild, MCP Server for Agent Graph Access, Wiki Export (agent-crawlable index), Confidence Scoring Rubric (EXTRACTED/INFERRED/AMBIGUOUS), Extraction Subagent Prompt Template, Node ID Format Convention (full-path stem) (+19 more)

### Community 6 - "devDependencies"
Cohesion: 0.07
Nodes (27): autoprefixer, cross-env, oxlint, devDependencies, autoprefixer, cross-env, electron, electron-builder (+19 more)

### Community 7 - "useLocale"
Cohesion: 0.15
Nodes (25): useLocale(), fmt(), fmtDate(), fmtNum(), PurchaseShow(), statusBadge(), CreditCustomers(), DayEnd() (+17 more)

### Community 8 - "Settings.jsx"
Cohesion: 0.24
Nodes (5): LANGS, PRIMARY_COLORS, Settings(), settingsApi, SIDEBAR_THEMES

### Community 9 - "add-tenant.js"
Cohesion: 0.05
Nodes (41): ask(), bcrypt, err(), fs, getModels, log(), main(), path (+33 more)

### Community 10 - "Dashboard.jsx"
Cohesion: 0.13
Nodes (17): dashboardApi, dayLabel(), DOW_LABELS, FastMoving(), fmtRs(), fmtShort(), Heatmap(), HOUR_LABELS (+9 more)

### Community 11 - "sales/Create.jsx"
Cohesion: 0.20
Nodes (13): translations, CartItemZoomModal(), CartRow(), fmt(), fmtAmt(), Icon, itemKey(), posApi (+5 more)

### Community 12 - "middleware/auth.js"
Cohesion: 0.22
Nodes (6): jwt, auth, { Op, fn, col, literal }, router, auth, router

### Community 13 - "role.js"
Cohesion: 0.22
Nodes (6): auth, role, router, auth, role, router

### Community 14 - "products.js"
Cohesion: 0.25
Nodes (6): auth, cache, NodeCache, { Op }, role, router

### Community 15 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 16 - "cacheSync.js"
Cohesion: 0.22
Nodes (17): db, API, fetchJSON(), headers(), lastSyncAge(), resolveEndpoint(), syncAll(), syncCategories() (+9 more)

### Community 17 - "Icons SVG Sprite Sheet"
Cohesion: 0.29
Nodes (7): Bluesky Social Icon, Discord Social Icon, Documentation Icon, GitHub Icon, Social / User Profile Icon, Icons SVG Sprite Sheet, X (Twitter) Social Icon

### Community 18 - "offlineQueue.js"
Cohesion: 0.08
Nodes (38): ConfirmModal(), DailyConnectionGate(), API, ProductForm(), UNITS, API, ConnectivityContext, ConnectivityProvider() (+30 more)

### Community 19 - "sales.js"
Cohesion: 0.33
Nodes (4): auth, { Op, fn, col, literal }, role, router

### Community 20 - "routes/auth.js"
Cohesion: 0.33
Nodes (4): auth, bcrypt, jwt, router

### Community 21 - "reports.js"
Cohesion: 0.40
Nodes (3): auth, { Op }, router

### Community 22 - "users.js"
Cohesion: 0.40
Nodes (4): auth, bcrypt, role, router

### Community 23 - "Electron Builder NSIS Installer Config"
Cohesion: 0.40
Nodes (5): Electron Builder NSIS Installer Config, Electron License (MIT/Chromium), Chromium Third-Party Licenses, Electron Packaged App 404 Router Bug Fix, Hash Router Strategy for Electron file:// Protocol

### Community 24 - "customers.js"
Cohesion: 0.40
Nodes (3): auth, { Op }, router

### Community 25 - "LMUC POS"
Cohesion: 0.11
Nodes (18): Adding a new tenant (full setup), API, API (`pos-api/`), Available Scripts, Client, Client (`pos-client/`), Development Setup, Electron (desktop) (+10 more)

### Community 26 - "settings.js"
Cohesion: 0.40
Nodes (4): auth, role, router, { spawn }

### Community 27 - "suppliers.js"
Cohesion: 0.50
Nodes (3): auth, role, router

### Community 28 - "Electron Builder Config"
Cohesion: 0.50
Nodes (4): Electron Builder Config, Electron v43.2.0, Lumac POS, NSIS Windows Installer Target

### Community 41 - "Electron/package.json"
Cohesion: 0.12
Nodes (15): author, description, devDependencies, electron, electron-builder, electron, electron-builder, license (+7 more)

### Community 44 - "main.cjs"
Cohesion: 0.15
Nodes (7): { app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }, createMainWindow(), DEFAULT_CONFIG, fs, getConfigPath(), path, readPrinterConfig()

### Community 45 - "Electron/main.js"
Cohesion: 0.16
Nodes (9): { app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }, createMainWindow(), DEFAULT_CONFIG, devLog(), finish(), fs, getConfigPath(), path (+1 more)

### Community 54 - "electron/main.js"
Cohesion: 0.27
Nodes (9): buildAppMenu(), buildSettingsOverlayScript(), createWindow(), DEFAULT_CONFIG, getConfigPath(), openSettingsOverlay(), readConfig(), resolvePreloadPath() (+1 more)

### Community 55 - "roles.js"
Cohesion: 0.33
Nodes (4): auth, DEFAULT_FEATURES, role, router

### Community 56 - "imagekit.js"
Cohesion: 0.50
Nodes (3): auth, crypto, router

## Knowledge Gaps
- **274 isolated node(s):** `{ app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }`, `path`, `fs`, `DEFAULT_CONFIG`, `{ app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }` (+269 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `index.jsx` to `AppLayout.jsx`, `baseApi.js`, `useLocale`, `Settings.jsx`, `Dashboard.jsx`, `sales/Create.jsx`, `.oxlintrc.json`, `cacheSync.js`, `offlineQueue.js`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `useLocale()` connect `useLocale` to `AppLayout.jsx`, `index.jsx`, `baseApi.js`, `Settings.jsx`, `Dashboard.jsx`, `sales/Create.jsx`, `offlineQueue.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `plugins` connect `.oxlintrc.json` to `index.jsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `selectRole()` (e.g. with `AppLayout()` and `CashierLayout()`) actually correct?**
  _`selectRole()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ app, BrowserWindow, ipcMain, globalShortcut, dialog, nativeImage }`, `path`, `fs` to the rest of the system?**
  _274 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AppLayout.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._
- **Should `index.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05087719298245614 - nodes in this community are weakly interconnected._