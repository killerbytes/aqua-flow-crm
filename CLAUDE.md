# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Aqua Flow is a CRM for a water refill business: customers, orders and dispatch, walk-in sales, invoices and payments, inventory, returnable-equipment tracking, and reports. It uses Next.js 15 (App Router), React 19, Sequelize 6 on PostgreSQL, Zod 3, Tailwind 4, and shadcn/ui. It deploys to Railway as a standalone build, with Sentry for monitoring.

## Commands

```bash
npm run dev                  # Dev server (needs PostgreSQL)
npm run build                # next build, then copies assets into .next/standalone
npm run type-check           # tsc --noEmit
npm test                     # Full Vitest suite (no PostgreSQL needed)

npx vitest run tests/integration/order_service.test.ts          # One file
npx vitest run tests/integration/order_service.test.ts -t "discounts"  # Tests matching a name

npm run db:migrate           # Also: db:migrate:undo, db:migrate:status
npm run db:migration:create -- --name add-something
```

There is no lint step: ESLint is not installed, so `.eslintrc.json` is not enforced. CI (`.github/workflows/ci.yml`) runs the type-check, tests, and build, and applies and rolls back all migrations on PostgreSQL. The nightly backup is a separate workflow.

Production runs `node .next/standalone/server.js`, not `npm start`. Security headers are set in `next.config.mjs`. The build needs dev dependencies, because `typescript` is what resolves the `@/` import paths. `sqlite3` is test-only, so production code must never import it. Railway runs `npm run db:migrate` before each deploy and waits for `/api/health` before sending traffic.

## Commands that can destroy data

The active database comes from `NODE_ENV`: `.env.<NODE_ENV>` overrides `.env.local`, which overrides `.env`. Check which database is targeted before running any of these, and don't run them with `NODE_ENV=production` unless explicitly asked.

- `npm run seed` **drops the whole `public` schema** on PostgreSQL by default, then rebuilds it with fake data.
- `npm run restore` overwrites the database from a backup.
- `npm run db:migrate` and `db:migrate:undo` change the schema of the targeted database. Migrations merged to `main` run against production on the next deploy, so they must be safe to apply while the old version is still serving.

## Architecture

### Request flow

```
src/app (Server Components)  ── reads ──────────────────────► services ─► models
src/features (Client Components) ─► src/backend/actions ─────► services ─► models
```

- **`src/app`** holds routes and fetches data. Data pages set `export const dynamic = "force-dynamic"`, call `await initDatabase()` and `await requirePagePermission("...")`, and then call services directly.
- **`src/features/<domain>/components`** holds domain UI. **`src/components`** holds shared UI, and `src/components/ui` is shadcn-generated.
- **`src/backend/actions`** holds Server Actions, built with `createProtectedAction` (`src/backend/lib/safe-action.ts`). It initializes the database, authenticates, checks the RBAC permission, validates with Zod, and returns `ActionResponse<T>` (`{ success: true, data }` or `{ success: false, error, fieldErrors? }`). Errors become return values rather than throws, so callers must check `success`.
- **`src/backend/services`** holds business logic as classes with static methods. This is the layer integration tests target.
- **`src/backend/models`** holds Sequelize models. Associations are all declared in `models/index.ts`, so import models from there.

### Authentication and permissions

There are three separate layers, and each covers something different:

1. **`src/middleware.ts`** (Edge runtime) redirects unauthenticated page requests to `/login` and refreshes the JWT. It skips `/api/*`, and it does not check roles.
2. **`createProtectedAction`** enforces roles on Server Actions, using `src/backend/rbac/permissions.ts`.
3. **Server Component pages** call `requirePagePermission("...")` (`src/backend/auth/context.ts`), which rejects missing sessions and deactivated users, since middleware can't reach the database, and checks the role. New pages must call it and be added to `tests/unit/auth/page_permissions.test.ts`. Call it outside any `try/catch`, because `redirect()` works by throwing. `RoleGuard` and the sidebar only hide things in the browser, so they never replace this check.

Auth has two modules: `src/lib/auth.edge.ts` is for middleware and must stay free of ORM imports, while `src/lib/auth.ts` is for the Node runtime. The session is an httpOnly `token` cookie holding a 15-minute JWT that renews itself, for up to 30 days from login.

Sessions are revoked with `AuthService.revokeSessions`, which increments `users.token_version` and so cancels all of that user's tokens at once. Logging out, changing a password, and changing an account's active status all call it. Only the Node check can see this, because middleware can't reach the database, which is why pages and actions must go through `requirePagePermission` and `createProtectedAction`.

### Database and tests

- **Schema changes need a migration** in `src/backend/migrations`. The app never runs `sync` against PostgreSQL at runtime.
- **Tests run on in-memory SQLite, and production on PostgreSQL.** The test schema is built from the models with `sequelize.sync`, so passing tests don't prove a migration exists or works. `define: { underscored: true }` is also only set for PostgreSQL, so column names differ between the two, and raw SQL may behave differently.
- **Money:** columns are `DECIMAL(10,2)` through `moneyColumn`, which reads them as numbers. Do arithmetic in centavos with `toCents` and `fromCents` (`src/lib/money.ts`). Order prices always come from the database, and any `unitPrice` or `discount` in a request is ignored.
- **Billing rules:** an order can be on one active invoice only (partial unique index on `invoice_details` where `voided_at` is null). Cancelled or paid orders can't be invoiced, and invoiced orders can't be cancelled or paid directly. New invoices are always unpaid. Admins and Managers can void an invoice with no payments, which frees its orders but keeps the invoice and its `invoice_details` rows as a record, so queries asking whether an order is invoiced must filter on `voidedAt: null`. Requests create orders through `OrderService.createForStaff`, which only lets the walk-in customer set status, payment status, and date.
- **Payments:** direct order payments are `OrderPayment` rows, and invoice payments are `InvoicePayment` rows. `Order.paymentStatus` is a summary of these. Admins and Managers can reverse either kind with a reason, and the row stays on record with `reversedAt` set, so every sum of payments must filter on `reversedAt: null`. `Order.deliveredAt` is set when an order becomes delivered.
- **Stock:** the `stock*` totals on `ProductInventory` change only through `EquipmentLedgerEntry` rows, whose `afterCreate` hook in `models/index.ts` updates them. `ProductService` refuses stock fields, and every ledger entry records `loggedBy`. The balance sheet report flags any product whose totals don't match its ledger.
- **Row locks:** use `lock: t.LOCK.UPDATE` without an `include`, because PostgreSQL rejects `FOR UPDATE` on outer joins. SQLite ignores locks, so tests can't catch this or a race.
- **Password hashes:** the `User` default scope excludes `passwordHash` from queries and includes. Only login uses `User.scope("withPassword")`. `User.create` and `update` results can still hold the hash, so return them through `toSafeUser`.
- **Deleting products:** `ProductService.delete` refuses while units are with customers (regular or temporary) or an undelivered order includes the product. Stock still in the station doesn't block it.
- **Deleting customers:** `CustomerService.delete` refuses while a customer has unpaid or undelivered orders, open invoices, or containers out, and always refuses the walk-in account. Includes on historical records use `paranoid: false` so deleted customers, products, and users still show their names.
- **Soft deletes:** `Customer`, `CustomerSpecialPricing`, `ProductInventory`, and `User` are paranoid. Use `{ paranoid: false }` to include deleted rows.
- **Date filtering** uses the `Asia/Manila` timezone via `moment-timezone`.

### Test layout

- `tests/integration`: services against seeded SQLite, using `setupTestDatabase()` from `tests/helpers/db.setup.ts`.
- `tests/unit/actions`: Server Actions, with `next/cache`, `initDatabase`, and the auth context mocked.
- `tests/ui`: runs in the `node` environment and jsdom is not installed, so these tests check source files and exports rather than rendered DOM. Adding DOM tests means adding a DOM environment first.

## Next.js rules

- Default to Server Components. Add `"use client"` only for state, effects, or browser APIs, and keep it as low in the tree as possible.
- Client code must not import from `src/backend` at runtime, except for calling Server Actions. Use `import type` for model and service types.
- Nothing reachable from `src/middleware.ts` may import Sequelize or other Node-only packages.
- `params`, `searchParams`, `cookies()`, and `headers()` are async in Next 15, so always `await` them.
- Cookies can only be written in Server Actions and Route Handlers, not while rendering.
- Put mutations in Server Actions through `createProtectedAction`, with a `permission` and usually a `schema`, and call `revalidatePath` for affected routes. Don't add Route Handlers for internal mutations; `src/app/api` is only for login and logout.
- `createProtectedAction` validates `args[0]`, so `(id, input)` actions must set `inputIndex: 1`. It passes the **original** arguments to the handler, so Zod defaults, transforms, and coercion are not applied to what the handler receives.
- Wrap multi-table writes in `sequelize.transaction` and pass `{ transaction: t }` to every query inside it.
- Read environment variables through `env` in `src/backend/db/env.ts`, and add new ones to its schema. Only `NEXT_PUBLIC_*` variables reach the browser, so never use that prefix for secrets.
- Packages with native or dynamic loading that are used on the server belong in `serverExternalPackages` in `next.config.mjs`.
- Use the `@/` alias for imports from `src`.
