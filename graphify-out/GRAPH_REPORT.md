# Graph Report - .  (2026-08-04)

## Corpus Check
- Large corpus: 102 files � ~2,884,676 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 518 nodes · 890 edges · 54 communities (33 shown, 21 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.83)
- Token cost: 1,320 input · 90 output

## Community Hubs (Navigation)
- React App Shell & Notifications
- Product Form & Runtime Config
- Frontend Runtime Dependencies
- RTK Query API Layer
- Express Backend Dependencies
- Graphify Knowledge Graph Skill
- Electron Build Tooling
- Reports & Localization
- Electron Main Process (Compiled)
- Express Server & DB Connection
- Dashboard Analytics
- Sales Create & Translations
- Auth Middleware & Media Routes
- Category & Purchase Routes
- Product Routes & Cache
- Linting Configuration
- Offline Invoices UI
- Public SVG Icons
- Products List Page
- Sales API Routes
- Auth API Routes
- Reports API Routes
- Users API Routes
- Build Artifacts & Session Docs
- Customers API Routes
- Dashboard API Routes
- Settings API Routes
- Suppliers API Routes
- Electron Builder Config
- App Entry & README
- FalkorDB Export
- Neo4j Export
- Token Benchmark
- Cluster-Only Update
- Favicon Icon
- Hero Image Asset
- React Logo Asset
- Vite Logo Asset
- Auth RTK Hooks
- Customer RTK Hooks
- Product RTK Hooks
- Purchase RTK Hooks
- Reports RTK Hooks
- Sales RTK Hooks
- Supplier RTK Hooks
- User RTK Hooks
- Offline Sync Gap Notes
- Home Button Feature Notes
- Offline Navigation Lock Notes
- Tenant Management Plan

## God Nodes (most connected - your core abstractions)
1. `useLocale()` - 53 edges
2. `react` - 27 edges
3. `api` - 18 edges
4. `selectRole()` - 18 edges
5. `Graphify Build Pipeline` - 15 edges
6. `selectCurrentUser()` - 13 edges
7. `getApiUrl()` - 12 edges
8. `AppLayout()` - 12 edges
9. `SalesCreate()` - 12 edges
10. `useConnectivity()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Project Graphify Knowledge Graph Config` --conceptually_related_to--> `Graphify Build Pipeline`  [INFERRED]
  CLAUDE.md → .claude/skills/graphify/SKILL.md
- `Native CLAUDE.md Graphify Integration` --conceptually_related_to--> `Project Graphify Knowledge Graph Config`  [INFERRED]
  .claude/skills/graphify/references/hooks.md → CLAUDE.md
- `Electron Builder NSIS Installer Config` --conceptually_related_to--> `Electron Packaged App 404 Router Bug Fix`  [INFERRED]
  pos-client/release/builder-debug.yml → summaries/2026-07-31-session-summary.md
- `SalesCreate()` --indirect_call--> `v()`  [INFERRED]
  pos-client/src/pages/sales/Create.jsx → pos-client/dist-electron/main.js
- `ProductForm()` --indirect_call--> `selectToken()`  [INFERRED]
  pos-client/src/components/products/ProductForm.jsx → pos-client/src/features/auth/authSlice.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graphify Auto-Update System (hook, watch, incremental)** — _claude_skills_graphify_references_hooks_git_commit_hook, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_update_incremental_update [INFERRED 0.85]
- **Graphify Query Interface (BFS, DFS, Path, Explain)** — _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_dfs_traversal, _claude_skills_graphify_references_query_path_query, _claude_skills_graphify_references_query_explain_node [EXTRACTED 1.00]
- **Electron POS Packaging and Distribution System** — pos_client_release_builder_debug_electron_builder_config, summaries_2026_07_31_session_summary_electron_404_bug_fix, pos_client_index_pos_client_app_entry [INFERRED 0.75]
- **Graphify Query Interface (BFS, DFS, Path, Explain)** — _claude_skills_graphify_references_query_bfs_traversal, _claude_skills_graphify_references_query_dfs_traversal, _claude_skills_graphify_references_query_path_query, _claude_skills_graphify_references_query_explain_node [EXTRACTED 1.00]
- **Graphify Auto-Update System (hook, watch, incremental)** — _claude_skills_graphify_references_hooks_git_commit_hook, _claude_skills_graphify_references_add_watch_watch_mode, _claude_skills_graphify_references_update_incremental_update [INFERRED 0.85]
- **Electron POS Packaging and Distribution System** — pos_client_release_builder_debug_electron_builder_config, summaries_2026_07_31_session_summary_electron_404_bug_fix, pos_client_index_pos_client_app_entry [INFERRED 0.75]

## Communities (54 total, 21 thin omitted)

### Community 0 - "React App Shell & Notifications"
Cohesion: 0.06
Nodes (44): store, API, fmt(), NotificationDrawer(), timeAgo(), useNotifBadge(), SyncBlocker(), API (+36 more)

### Community 1 - "Product Form & Runtime Config"
Cohesion: 0.06
Nodes (39): API, ProductForm(), UNITS, getApiUrl(), getStoredLocale(), LocaleContext, LocaleProvider(), LOCALES (+31 more)

### Community 2 - "Frontend Runtime Dependencies"
Cohesion: 0.05
Nodes (42): axios, dexie, build, appId, directories, files, nsis, productName (+34 more)

### Community 3 - "RTK Query API Layer"
Cohesion: 0.09
Nodes (24): api, authApi, customersApi, productsApi, purchasesApi, reportsApi, salesApi, suppliersApi (+16 more)

### Community 4 - "Express Backend Dependencies"
Cohesion: 0.06
Nodes (30): bcryptjs, cors, dotenv, express, express-validator, jsonwebtoken, mysql2, node-cache (+22 more)

### Community 5 - "Graphify Knowledge Graph Skill"
Cohesion: 0.09
Nodes (27): Graphify Skill Trigger Rule, Add URL Command, Watch Mode Auto-Rebuild, MCP Server for Agent Graph Access, Wiki Export (agent-crawlable index), Confidence Scoring Rubric (EXTRACTED/INFERRED/AMBIGUOUS), Extraction Subagent Prompt Template, Node ID Format Convention (full-path stem) (+19 more)

### Community 6 - "Electron Build Tooling"
Cohesion: 0.07
Nodes (27): autoprefixer, cross-env, electron, electron-builder, oxlint, devDependencies, autoprefixer, cross-env (+19 more)

### Community 7 - "Reports & Localization"
Cohesion: 0.20
Nodes (18): useLocale(), CreditCustomers(), DayEnd(), fmt(), fmtDate(), fmtQty(), LowStock(), Monthly() (+10 more)

### Community 8 - "Electron Main Process (Compiled)"
Cohesion: 0.13
Nodes (13): C(), E(), f(), S(), T(), v(), w(), y() (+5 more)

### Community 9 - "Express Server & DB Connection"
Cohesion: 0.13
Nodes (13): app, cors, express, tenant, connectionCache, createConnection(), getModels, getTenantDb() (+5 more)

### Community 10 - "Dashboard Analytics"
Cohesion: 0.17
Nodes (14): Dashboard(), dashboardApi, dayLabel(), DOW_LABELS, FastMoving(), fmtRs(), fmtShort(), Heatmap() (+6 more)

### Community 11 - "Sales Create & Translations"
Cohesion: 0.20
Nodes (13): translations, CartItemZoomModal(), CartRow(), fmt(), fmtAmt(), Icon, itemKey(), posApi (+5 more)

### Community 12 - "Auth Middleware & Media Routes"
Cohesion: 0.22
Nodes (6): jwt, auth, crypto, router, auth, router

### Community 13 - "Category & Purchase Routes"
Cohesion: 0.22
Nodes (6): auth, role, router, auth, role, router

### Community 14 - "Product Routes & Cache"
Cohesion: 0.25
Nodes (6): auth, cache, NodeCache, { Op }, role, router

### Community 15 - "Linting Configuration"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 16 - "Offline Invoices UI"
Cohesion: 0.50
Nodes (7): buildPrintHtml(), fmt(), fmtDateTime(), invoiceNo(), OfflineInvoicesDrawer(), STATUS_STYLES, getAllOfflineItems()

### Community 17 - "Public SVG Icons"
Cohesion: 0.29
Nodes (7): Bluesky Social Icon, Discord Social Icon, Documentation Icon, GitHub Icon, Social / User Profile Icon, Icons SVG Sprite Sheet, X (Twitter) Social Icon

### Community 18 - "Products List Page"
Cohesion: 0.38
Nodes (3): fmtPrice(), fmtStock(), ProductsIndex()

### Community 19 - "Sales API Routes"
Cohesion: 0.33
Nodes (4): auth, { Op, fn, col, literal }, role, router

### Community 20 - "Auth API Routes"
Cohesion: 0.40
Nodes (4): auth, bcrypt, jwt, router

### Community 21 - "Reports API Routes"
Cohesion: 0.40
Nodes (3): auth, { Op }, router

### Community 22 - "Users API Routes"
Cohesion: 0.40
Nodes (4): auth, bcrypt, role, router

### Community 23 - "Build Artifacts & Session Docs"
Cohesion: 0.40
Nodes (5): Electron Builder NSIS Installer Config, Electron License (MIT/Chromium), Chromium Third-Party Licenses, Electron Packaged App 404 Router Bug Fix, Hash Router Strategy for Electron file:// Protocol

### Community 24 - "Customers API Routes"
Cohesion: 0.50
Nodes (3): auth, { Op }, router

### Community 25 - "Dashboard API Routes"
Cohesion: 0.50
Nodes (3): auth, { Op, fn, col, literal }, router

### Community 26 - "Settings API Routes"
Cohesion: 0.50
Nodes (3): auth, role, router

### Community 27 - "Suppliers API Routes"
Cohesion: 0.50
Nodes (3): auth, role, router

### Community 28 - "Electron Builder Config"
Cohesion: 0.50
Nodes (4): Electron Builder Config, Electron v43.2.0, Lumac POS, NSIS Windows Installer Target

## Knowledge Gaps
- **203 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+198 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useLocale()` connect `Reports & Localization` to `React App Shell & Notifications`, `Product Form & Runtime Config`, `RTK Query API Layer`, `Electron Main Process (Compiled)`, `Dashboard Analytics`, `Sales Create & Translations`, `Products List Page`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `react` connect `React App Shell & Notifications` to `Product Form & Runtime Config`, `RTK Query API Layer`, `Reports & Localization`, `Electron Main Process (Compiled)`, `Dashboard Analytics`, `Sales Create & Translations`, `Linting Configuration`, `Offline Invoices UI`, `Products List Page`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `v()` connect `Electron Main Process (Compiled)` to `Sales Create & Translations`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `selectRole()` (e.g. with `AppLayout()` and `CashierLayout()`) actually correct?**
  _`selectRole()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _203 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React App Shell & Notifications` be split into smaller, more focused modules?**
  _Cohesion score 0.06153846153846154 - nodes in this community are weakly interconnected._
- **Should `Product Form & Runtime Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06345848757271286 - nodes in this community are weakly interconnected._