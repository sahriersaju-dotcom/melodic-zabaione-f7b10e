# AGENTS.md

Overview of the project structure for developers and AI agents working on this codebase.

## Project Overview

Inventory Manager: a web app for product entry and stock maintenance. Users create
products (SKU, name, category, price, reorder threshold), then record stock
in/out movements against them. The home page shows live totals (SKU count, total
units, inventory value) and flags products at or below their reorder threshold.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| Icons | lucide-react |
| Database | Netlify Database (managed Postgres) via Drizzle ORM |
| Validation | Zod |
| Language | TypeScript 5.9 (strict mode) |
| Deployment | Netlify |

## Directory Structure

```
├── db
│   ├── schema.ts        # Drizzle table definitions: products, stock_movements
│   └── index.ts         # Drizzle client (Netlify Database adapter)
├── drizzle.config.ts    # Drizzle Kit config; migrations output to netlify/database/migrations
├── netlify/database/migrations/  # Auto-applied SQL migrations — never edit an applied one
├── src
│   ├── routes
│   │   ├── __root.tsx   # Root HTML shell + document head
│   │   └── index.tsx    # The entire app UI: stats, product table, add/edit/stock modals
│   ├── server
│   │   ├── products.server.ts     # DB queries/mutations (server-only)
│   │   └── products.functions.ts  # createServerFn wrappers exposed to the client
│   ├── router.tsx       # TanStack Router setup
│   └── styles.css       # Tailwind import + shared `.input` class
├── netlify.toml
└── package.json
```

## Data model

- `products`: sku (unique), name, category, price, quantity, reorder_level, timestamps.
- `stock_movements`: product_id, type ('in' | 'out'), quantity, note, created_at — an
  audit trail of every stock adjustment.

Quantity is never edited directly from the product form — it only changes through
`adjustStock`, which writes a movement row and updates the product's quantity in the
same operation, so the movement history always reconciles with the current quantity.

## Conventions

- Server-only DB logic lives in `*.server.ts`; the matching `*.functions.ts` file
  wraps each function with `createServerFn` and Zod input validation. Client code
  only ever imports from `*.functions.ts`.
- Route loaders (`Route.useLoaderData()`) fetch initial data; mutations call
  `router.invalidate()` afterward to refresh loader data rather than managing
  duplicate client-side state.
- Schema changes: edit `db/schema.ts`, then run
  `npx drizzle-kit generate --name <change>` to create a migration. Netlify applies
  migrations automatically at deploy time — never run `drizzle-kit push` or apply
  SQL manually.

## Development Commands

```bash
pnpm install
netlify dev      # local dev server with database + functions emulation
```
