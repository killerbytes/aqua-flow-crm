# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Aqua Flow is a CRM for a water refill business: customers, orders and dispatch, walk-in sales, invoices and payments, inventory, returnable-equipment tracking, and reports. It uses Next.js 16 (App Router), React 19, Sequelize 6 on PostgreSQL, Zod 4, Tailwind 4, and shadcn/ui. It deploys to Railway as a standalone build, with Sentry for monitoring.

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

### Types

- **Models declare their columns.** Each class extends `Model<InferAttributes<X>, InferCreationAttributes<X>>`, so `create`, `update`, and `where` are checked. A new column needs a `declare` line (`CreationOptional<T>` when it has a default, `T | null` when nullable) and a new association needs a `NonAttribute<...>` line. Column definitions go through `columns<X>({...})` (`models/plain.ts`), which lets the timestamp columns be left out.
- **Services return plain records through `toPlain(instance)`**, not `instance.get({ plain: true })`, which Sequelize types as the columns only. Outside `src/backend`, import record types from `@/types/models` (`Customer`, `Order`, and so on are the plain shapes there), not from the models.
- **Unvalidated input is `unknown`.** Service methods that parse with Zod take `input: unknown`, and catch blocks read messages with `errorMessage` (`src/lib/errors.ts`).
- **`any` is not allowed in `src`.** `tests/unit/no_explicit_any.test.ts` fails on a new one. Its allowlist holds the two places that need it, each explained beside the code.
- **Session tokens:** `decodeToken` rejects a token whose `userId`, `tokenVersion`, or `sessionStart` is not a number, and `getAuthContext` treats a token without a complete user (id, name, username, valid role) as no session.

### Authentication and permissions

There are three separate layers, and each covers something different:

1. **`src/proxy.ts`** (Next.js 16's renamed middleware) redirects unauthenticated page requests to `/login` and refreshes the JWT. It skips `/api/*`, and it does not check roles.
2. **`createProtectedAction`** enforces roles on Server Actions, using `src/backend/rbac/permissions.ts`.
3. **Server Component pages** call `requirePagePermission("...")` (`src/backend/auth/context.ts`), which rejects missing sessions and deactivated users, since middleware can't reach the database, and checks the role. New pages must call it and be added to `tests/unit/auth/page_permissions.test.ts`. Call it outside any `try/catch`, because `redirect()` works by throwing. `RoleGuard` and the sidebar only hide things in the browser, so they never replace this check.

Auth has two modules: `src/lib/auth.edge.ts` is for the proxy and stays free of ORM imports, while `src/lib/auth.ts` is for the Node runtime. The session is an httpOnly `token` cookie holding a 15-minute JWT that renews itself, for up to 30 days from login.

Sessions are revoked with `AuthService.revokeSessions`, which increments `users.token_version` and so cancels all of that user's tokens at once. Logging out, changing a password, and changing an account's active status all call it. Only the Node check can see this, because middleware can't reach the database, which is why pages and actions must go through `requirePagePermission` and `createProtectedAction`.

### Database and tests

- **Schema changes need a migration** in `src/backend/migrations`. The app never runs `sync` against PostgreSQL at runtime.
- **Tests run on in-memory SQLite, and production on PostgreSQL.** The test schema is built from the models with `sequelize.sync`, so passing tests don't prove a migration exists or works. `define: { underscored: true }` is also only set for PostgreSQL, so column names differ between the two, and raw SQL may behave differently.
- **Money:** columns are `DECIMAL(10,2)` through `moneyColumn`, which reads them as numbers. Do arithmetic in centavos with `toCents` and `fromCents` (`src/lib/money.ts`). Order prices always come from the database, and any `unitPrice` or `discount` in a request is ignored. The exceptions are `Order.surcharge`, a flat per-order fee that staff set on the order form and that is included in `totalAmount`, and walk-in counter sales (below).
- **Billing rules:** an order can be on one active invoice only (partial unique index on `invoice_details` where `voided_at` is null). Cancelled or paid orders can't be invoiced, and invoiced orders can't be cancelled or paid directly. New invoices are always unpaid. Admins and Managers can void an invoice with no payments, which frees its orders but keeps the invoice and its `invoice_details` rows as a record, so queries asking whether an order is invoiced must filter on `voidedAt: null`. Requests create orders through `OrderService.createForStaff`, which only lets the walk-in customer set status and payment status. Any order can be given an earlier date when it's created or while it's pending (`OrderService.update`; sending the order's own day back leaves its date untouched): a `YYYY-MM-DD` date becomes that Manila day at the current time of day, and dates after today or more than `MAX_ORDER_BACKDATE_DAYS` (30) Manila days back are refused. `deliveredAt` stays the real time the order is marked delivered.
- **Walk-in counter sales:** the Walk-In Sales button on `/orders` records one cash total, not itemized, through `OrderService.recordWalkInSale`. It becomes an order on the walk-in account with no `OrderDetail` rows, delivered and paid in cash, dated like any order (backdating included). Several can go on the same day, and a wrong one is voided like any paid order. The Sales report shows these totals on their own "Walk-in Sales (not itemized)" line with no units, so any per-product figure must allow for orders without items.
- **Payments:** direct order payments are `OrderPayment` rows, and invoice payments are `InvoicePayment` rows. `Order.paymentStatus` is a summary of these. Admins and Managers can reverse either kind with a reason, and the row stays on record with `reversedAt` set, so every sum of payments must filter on `reversedAt: null`. `Order.deliveredAt` is set when an order becomes delivered.
- **Voiding orders:** Admins and Managers cancel an order at any stage with `OrderService.voidOrder`, which needs a reason, records `voidedAt`, `voidedBy`, and `voidReason`, and reverses any direct payment with that reason. It refuses an order on an active invoice. Cashiers hold `VOID_PENDING_ORDER` instead of `CANCEL_ORDER`, so `voidOrderAction` passes `pendingUnpaidOnly` and the service refuses them any order that is paid or no longer pending. `updateOrderStatusAction` refuses `CANCELLED`, so requests can only cancel by voiding. Orders are never deleted. The Voids & Reversals report counts voids and reversals per user.
- **Dashboard:** figures come from `DashboardService` (`src/backend/services/dashboard.service.ts`), with days in Philippine time. Sales count delivered orders by `Order.deliveredAt` plus retail sales by `RetailSale.soldAt`, and deliveries per person by `Order.deliveredBy`. A product's optional `lowStockThreshold` turns on its low stock warning. The trend chart is hand-built SVG in `src/features/dashboard`, with no chart library, and its dark-mode color is `--chart-1`.
- **Stock:** the `stock*` totals on `ProductInventory` change only through `EquipmentLedgerEntry` rows, whose `afterCreate` hook in `models/index.ts` updates them. `ProductService` refuses stock fields, and every ledger entry records `loggedBy`. The balance sheet report flags any product whose totals don't match its ledger.
- **Retail:** brand-new items (such as new 5-gallon containers) are sold over the counter on `/retail`, apart from refill orders, in `src/backend/services/retail.service.ts`. Their stock is separate from the refill products' container fleet and never touches the equipment ledger. `RetailProduct.stockOnHand` changes only through `RetailStockEntry` rows (restock, sale, returns from voided sales, write-off), whose `afterCreate` hook in `models/index.ts` applies their signed `quantityChange`, so write entries with `create`, not `bulkCreate`. `RetailProductService` refuses stock fields. A `RetailSale` is always paid in full when it's recorded and carries its own payment method, so it is never owed. It's dated when recorded, with no backdating, and a sale without a customer goes on the walk-in account. Line prices come from `basePrice` in the database; `discount`, a peso amount off the bill of at most the subtotal, is the only amount staff set. Admins and Managers void a sale with a reason, which returns its units to stock and keeps the sale on record, so every sum of retail sales must filter on `voidedAt: null`. The Sales report and the dashboard count retail sales by `soldAt`, and the Retail Stock report checks each stored count against its entries.
- **Row locks:** use `lock: t.LOCK.UPDATE` without an `include`, because PostgreSQL rejects `FOR UPDATE` on outer joins. SQLite ignores locks, so tests can't catch this or a race.
- **Password hashes:** the `User` default scope excludes `passwordHash` from queries and includes. Only login uses `User.scope("withPassword")`. `User.create` and `update` results can still hold the hash, so return them through `toSafeUser`.
- **Deleting products:** `ProductService.delete` refuses while units are with customers (regular or temporary) or an undelivered order includes the product. Stock still in the station doesn't block it.
- **Deleting customers:** `CustomerService.delete` refuses while a customer has unpaid or undelivered orders, open invoices, or containers out, and always refuses the walk-in account. `CustomerService.update` refuses setting a customer inactive while any equipment, regular or temporary, is out, and `EquipmentService.logEquipment` refuses to issue or lend equipment to an inactive customer (returns, losses, and damage are still allowed). That is why the reports can leave inactive customers out. Includes on historical records use `paranoid: false` so deleted customers, products, and users still show their names.
- **Soft deletes:** `Customer`, `CustomerSpecialPricing`, `ProductInventory`, and `User` are paranoid. Use `{ paranoid: false }` to include deleted rows.
- **Date filtering** uses the `Asia/Manila` timezone via `date-fns-tz` (`src/lib/business-time.ts`).
- **Reports:** each one lives at `/reports/<slug>`, with a `print` page (the browser saves it as a PDF) and a read-only `csv` Route Handler beside it. Columns are defined once in `src/features/reports/definitions.ts` and shared by the screen, the printout, and the CSV. Report pages call `requirePagePermission("VIEW_REPORTS")`; the CSV routes call `requirePagePermission("EXPORT_REPORTS")`, which only Admins have, and the CSV buttons show only for them. `page_permissions.test.ts` checks every `route.ts` outside `/api` as well as every page.

### Test layout

- `tests/integration`: services against seeded SQLite, using `setupTestDatabase()` from `tests/helpers/db.setup.ts`.
- `tests/unit/actions`: Server Actions, with `next/cache`, `initDatabase`, the auth context, and the services mocked. `action_permissions.test.ts` lists every action with the roles allowed to run it, and fails when a new action is missing from the list.
- `tests/helpers/session.ts`: `signInAs(role)` for action tests, and `forgeClaims` for signing tokens `signToken` won't produce (expired, wrong secret, malformed claims).
- There are no component tests: Vitest runs in the `node` environment and jsdom is not installed. Adding DOM tests means adding a DOM environment first. Don't add tests that only check a source file contains a string.

## Next.js rules

- Default to Server Components. Add `"use client"` only for state, effects, or browser APIs, and keep it as low in the tree as possible.
- Client code must not import from `src/backend` at runtime, except for calling Server Actions. Use `import type` for service types, and take record types from `@/types/models`.
- Keep `src/proxy.ts` free of database access. It runs on every request, including static ones, so checks that need the database belong in `requirePagePermission` and `createProtectedAction`.
- `params`, `searchParams`, `cookies()`, and `headers()` are async since Next 15, so always `await` them.
- Cookies can only be written in Server Actions and Route Handlers, not while rendering.
- Put mutations in Server Actions through `createProtectedAction`, with a `permission` and usually a `schema`, and call `revalidatePath` for affected routes. Don't add Route Handlers for internal mutations; `src/app/api` is only for login and logout.
- `createProtectedAction` validates `args[0]`, so `(id, input)` actions must set `inputIndex: 1`. It passes the **original** arguments to the handler, so Zod defaults, transforms, and coercion are not applied to what the handler receives.
- Wrap multi-table writes in `sequelize.transaction` and pass `{ transaction: t }` to every query inside it.
- Read environment variables through `env` in `src/backend/db/env.ts`, and add new ones to its schema. Only `NEXT_PUBLIC_*` variables reach the browser, so never use that prefix for secrets.
- Packages with native or dynamic loading that are used on the server belong in `serverExternalPackages` in `next.config.mjs`.
- Use the `@/` alias for imports from `src`.
