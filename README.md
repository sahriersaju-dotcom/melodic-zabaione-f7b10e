# Inventory Manager

A web app for entering products and maintaining stock levels. Built as an internal
inventory tool: add products with SKU/price/reorder threshold, then record stock
in/out movements as inventory changes, with live totals and low-stock alerts.

## Key technologies

- [TanStack Start](https://tanstack.com/start) (React) for routing, server functions, and SSR
- Tailwind CSS for styling
- Netlify Database (managed Postgres) with Drizzle ORM for persistence
- Deployed on Netlify

## Running locally

```bash
pnpm install
netlify dev
```

The Netlify CLI provisions a local database branch automatically and applies any
pending migrations in `netlify/database/migrations/` before the app starts.

## Data model

- `products` — SKU, name, category, price, current quantity, reorder threshold
- `stock_movements` — history of stock in/out adjustments per product

Schema changes go in `db/schema.ts`; run `npx drizzle-kit generate --name <change>`
to produce a new migration file.
