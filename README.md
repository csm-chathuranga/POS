# LMUC POS

Multi-tenant Point of Sale system — Express.js API + React/Vite/Tailwind client + Electron desktop app.

---

## Stack

| Layer    | Technology |
|----------|-----------|
| API      | Node.js, Express, Sequelize, MySQL |
| Client   | React, Vite, Tailwind CSS, Redux Toolkit |
| Desktop  | Electron |
| Auth     | JWT, role-based (`admin`, `manager`, `cashier`) |

---

## Project Structure

```
pos-api/        — Express REST API (multi-tenant, per-subdomain DB)
pos-client/     — React SPA + Electron shell
```

---

## Development Setup

### API

```bash
cd pos-api
npm install
cp .env.example .env   # set DB_HOST, JWT_SECRET, etc.
npm run dev            # nodemon
```

### Client

```bash
cd pos-client
npm install
npm run dev            # Vite dev server
```

### Electron (desktop)

```bash
cd pos-client
npm run electron:dev
```

---

## Tenant Management

Each subdomain maps to its own MySQL database, configured in `pos-api/src/config/tenants.js`.

### Adding a new tenant (full setup)

Interactively creates the MySQL database, grants privileges, patches `tenants.js`, migrates schema, seeds master data, and creates the first admin user.

```bash
cd pos-api
node scripts/add-tenant.js
```

Prompts:
```
Subdomain host:      newshop-pos.lumac.cc
Database name:       newshop_db
DB username:         pos_user
DB password:         ****
DB host:             localhost
MySQL root user:     root
MySQL root password: ****
Admin full name:     Kasun Silva
Admin email:         admin@newshop.lk
Admin password:      ****
```

---

### Migrate an existing tenant

Use this when:
- The database already exists (added to `tenants.js` manually)
- You want to provision a fresh database with schema + master data + first admin user

**Step 1** — Add the tenant to `pos-api/src/config/tenants.js`:

```js
'newshop-pos.lumac.cc': {
  database: 'newshop_db',
  username: 'pos_user',
  password: 'Pos@2026Strong',
},
```

**Step 2** — Run the migrate script:

```bash
cd pos-api
node scripts/migrate.js newshop-pos.lumac.cc
```

or

```bash
npm run migrate newshop-pos.lumac.cc
```

Prompts for admin credentials, then automatically:

| Step | Action |
|------|--------|
| 1 | `sync({ alter: true })` — creates / updates all tables (safe, no data loss) |
| 2 | Seeds roles: `admin`, `manager`, `cashier` |
| 3 | Seeds default categories: `General`, `Other` |
| 4 | Seeds default settings (shop name, currency, receipt footer, etc.) |
| 5 | Creates the first admin user |

**Step 3** — Restart the API:

```bash
pm2 restart pos-api
```

---

### Schema changes (existing tenants)

When you add a new column or model to `pos-api/src/models/index.js`, apply it to an existing tenant:

```bash
node scripts/migrate.js <host>
```

Sequelize `alter: true` adds new columns/tables without touching existing data.

---

## Roles

| Role      | Permissions |
|-----------|-------------|
| `admin`   | Full access — users, settings, reports, all CRUD |
| `manager` | Sales, purchases, products, customers, suppliers, settings |
| `cashier` | POS sales only |

---

## Environment Variables (`pos-api/.env`)

```env
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=your_secret_here
PORT=3001
```

---

## Available Scripts

### API (`pos-api/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API with nodemon |
| `npm start` | Start API (production) |
| `npm run migrate <host>` | Migrate + seed a tenant |
| `node scripts/add-tenant.js` | Interactive full tenant setup |
| `node scripts/migrate.js <host>` | Migrate + seed existing tenant |

### Client (`pos-client/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run electron:dev` | Electron + Vite dev |
| `npm run electron:build` | Build Electron installer |



# Existing DB — schema changes only, no data touched
node scripts/migrate.js chandana-pos.lumac.cc

# New DB — schema + seed roles + settings + admin user
node scripts/migrate.js newshop-pos.lumac.cc --seed


node scripts/migrate.js newshop-pos.lumac.cc --fresh