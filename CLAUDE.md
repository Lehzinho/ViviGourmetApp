# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Vivi Gourmet is a multi-tenant SaaS for food-business pricing and customer management. Turborepo monorepo with:

- `apps/api` — NestJS 10, Prisma, PostgreSQL, JWT auth
- `apps/web` — Next.js 14 App Router, Styled Components, React Query
- `packages/shared` — shared TypeScript types and utilities

## Prerequisites & Setup

Requires Node.js 20 LTS, npm 11.x, Docker Desktop (PostgreSQL 15 on port **5433**).

```powershell
copy .env.example apps\api\.env
docker compose up -d
npm install
npm run db:push -w @vivi-gourmet/api
npm run dev
```

Services: **Web** → http://localhost:3000 | **API** → http://localhost:3001 | **pgAdmin** → http://localhost:5050

**PowerShell gotcha** — limpar `DATABASE_URL` antes de comandos Prisma:
```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

## Common Commands

### Root (Turborepo)
| Command | What it does |
|---------|-------------|
| `npm run dev` | Start all services |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint/typecheck all |

### API (`apps/api`)
| Command | What it does |
|---------|-------------|
| `npm run dev -w @vivi-gourmet/api` | Start API only |
| `npm run test -w @vivi-gourmet/api` | Run Jest tests |
| `npm run test:watch -w @vivi-gourmet/api` | Jest watch mode |
| `npm run db:push -w @vivi-gourmet/api` | Sync schema (dev, no migration file) |
| `npm run db:migrate -w @vivi-gourmet/api` | Create versioned migration |

### Web (`apps/web`)
| Command | What it does |
|---------|-------------|
| `npm run dev -w @vivi-gourmet/web` | Start Next.js only |

## Architecture

### Multi-tenancy
Every entity belongs to a **Company** (tenant). `companyId` must always be present in Prisma queries — there are no cross-company reads. JWT payload: `sub`, `companyId`, `role`. Users linked via `CompanyUser` (OWNER / ADMIN / MEMBER roles).

### Soft-delete
`deletedAt DateTime?` on: `User`, `Company`, `Ingredient`, `Recipe`, `Product`, `Expense`, `Customer`, `Menu`. Always filter `deletedAt: null` in queries for active records. `MenuItem` and `OrderItem` do **not** have soft-delete (physically deleted). When soft-deleting `Menu`, rename its `slug` with `__deleted__<timestamp>` suffix to free the unique slug for reuse.

### Ingredient pricing — append-only
`IngredientPrice` rows are **append-only** — never update existing rows. Always insert a new row when a price changes. Latest price = most recent `createdAt` for a given `ingredientId`.

### RecipeItem
Must reference **either** `ingredientId` **or** `subRecipeId` — never both, never neither. Validated in application code.

### CostCalculator
Recursive recipe-cost engine with 5-minute in-process cache. Detects circular sub-recipe dependencies via a visited `Set`. Consumed internally by other services and exposed via `GET /cost-calculator/recipe/:id`.

### Order flow
Orders are created with status directly (no open comanda step in MVP). `orderNumber` is sequential per company, computed in application code — race condition exists; no DB unique constraint on `(companyId, orderNumber)`.

## API Modules (`apps/api/src`)

All modules are registered in `AppModule` (`app.module.ts`).

| Module | Controller(s) | Key routes |
|--------|--------------|-----------|
| `AuthModule` | `auth.controller.ts` | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me` |
| `PrismaModule` | — | Global singleton `PrismaService` |
| `CostCalculatorModule` | `cost-calculator.controller.ts` | `GET /cost-calculator/recipe/:id` |
| `IngredientsModule` | `ingredients.controller.ts` | `CRUD /ingredients` + `POST /ingredients/:id/prices` |
| `RecipesModule` | `recipes.controller.ts` | `CRUD /recipes` |
| `ProductsModule` | `products.controller.ts` | `CRUD /products` |
| `ExpensesModule` | `expenses.controller.ts` | `CRUD /expenses` — note: `GET /expenses/summary` route must be declared BEFORE `GET /expenses/:id` in the controller |
| `MenusModule` | `menus.controller.ts` | `CRUD /menus` + `POST /menus/:id/items` + `DELETE /menus/:id/items/:itemId` + `PATCH /menus/:id/items/reorder` |
| `CustomersModule` | `customers.controller.ts` + `orders.controller.ts` | `CRUD /customers` + `GET /customers/:id/profile` + `CRUD /orders` + `PATCH /orders/:id/cancel` |
| `DashboardModule` | `dashboard.controller.ts` | `GET /dashboard/summary` |

Guards on all authenticated routes: `@UseGuards(JwtAuthGuard)`. Company isolation via `@CurrentUser("companyId")`.

## Web (`apps/web`)

### Routes
| Route | Description |
|-------|-------------|
| `/` | Redirects to `/dashboard` |
| `/login` | JWT login with auto-refresh |
| `/dashboard` | KPIs, recent recipes, top products, expenses widget |
| `/ingredientes` | Ingredients CRUD (raw + semi-finished, price history) |
| `/receitas` | Recipes CRUD with ingredient/sub-recipe selector and cost |
| `/produtos` | Products CRUD with pricing card and margin |
| `/despesas` | Expenses CRUD with period filters and summary card |
| `/cardapio` | Menus CRUD + items panel with reorder |
| `/clientes` | Customer list with search and pagination |
| `/clientes/[id]` | Customer profile: KPIs, order history, new-order inline |

### Key files
| File | Description |
|------|-------------|
| `lib/apiClient.ts` | Axios instance — Bearer token + silent 401 refresh (deduped) |
| `lib/theme.ts` | Styled Components theme tokens |
| `lib/navigation.ts` | Sidebar nav items (`dashboardNav`, `pathTitleMap`) |
| `middleware.ts` | Route protection — redirects to `/login` if no token |
| `components/layout/AppShell.tsx` | Sidebar + Header layout wrapper |
| `components/providers/AppProviders.tsx` | React Query `QueryClientProvider` + global providers |

Token storage: `localStorage` keys `vivi_gourmet_access_token` / `vivi_gourmet_refresh_token` + cookie `vivi_logged_in` (for middleware route checks).

## Git Workflow (OBRIGATÓRIO)

Full rules in `.claude/rules/git-workflow.md`.

**Before any file change:**
1. `git branch --show-current`
2. `git status`
3. `git pull`
4. `git checkout -b <tipo>/<nome>`

Types: `feature/` · `fix/` · `refactor/` · `chore/`

**Prohibited:** modifying `main`/`master`/`develop` directly · `git push` without explicit user permission.

## Key Prisma Schema Facts

- `RecipeItem.subRecipeId` currently missing from schema (known gap) — validated in application code only
- `MenuItem.order` maps to column `sort_order` via `@map("sort_order")`
- `Menu.slug` has `@@unique([companyId, slug])` — must rename slug with tombstone suffix on soft-delete
- Neon DB advisory lock issue: `prisma migrate dev` and `migrate resolve` fail with P1002 timeout. Workaround: use `db:push` to sync schema, then create migration file manually and mark applied
