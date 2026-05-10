# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Vivi Gourmet is a multi-tenant SaaS for food-business pricing. It is a **Turborepo monorepo** with two apps and one shared package:

- `apps/api` — NestJS 10, Prisma, PostgreSQL, JWT auth
- `apps/web` — Next.js 14 App Router, Styled Components, React Query (TanStack Query)
- `packages/shared` — shared TypeScript types and utilities consumed by both apps

## Prerequisites & Setup

Requires Node.js 20 LTS, npm 11.x, and Docker Desktop (PostgreSQL 15 on port **5433**).

```powershell
# 1. Copy env file and set DATABASE_URL, JWT_SECRET, etc.
copy .env.example apps\api\.env

# 2. Start Postgres
docker compose up -d

# 3. Install dependencies
npm install

# 4. Sync Prisma schema
npm run db:push -w @vivi-gourmet/api

# 5. Start all services
npm run dev
```

Services: **Web** → http://localhost:3000 | **API** → http://localhost:3001 | **pgAdmin** → http://localhost:5050

**PowerShell gotcha:** if `$env:DATABASE_URL` is set in the session, it overrides `apps/api/.env`. Clear it before Prisma commands:
```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

## Common Commands

### Root (Turborepo)
| Command | What it does |
|---------|-------------|
| `npm run dev` | Start all services concurrently with Turborepo |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint/typecheck all workspaces |

### API (`apps/api`)
| Command | What it does |
|---------|-------------|
| `npm run dev -w @vivi-gourmet/api` | Start only the API |
| `npm run test -w @vivi-gourmet/api` | Run Jest tests |
| `npm run test:watch -w @vivi-gourmet/api` | Jest in watch mode |
| `npm run db:push -w @vivi-gourmet/api` | Sync schema (dev, no migration file) |
| `npm run db:migrate -w @vivi-gourmet/api` | Create versioned migration |

### Web (`apps/web`)
| Command | What it does |
|---------|-------------|
| `npm run dev -w @vivi-gourmet/web` | Start only Next.js |

## Architecture

### Multi-tenancy model
Every domain entity belongs to a **Company** (the tenant). The `companyId` must always be carried through Prisma queries — there are no cross-company reads. Users belong to companies via `CompanyUser` (with `OWNER / ADMIN / MEMBER` roles). Authentication issues a short-lived JWT access token (payload: `sub`, `companyId`, `role`) plus an opaque refresh token stored hashed (`sha256`) in the `RefreshToken` table.

### API module layout (`apps/api/src`)
- **`AuthModule`** — register, login, refresh, logout. Passport-JWT strategy validates the access token; `JwtAuthGuard`, `RolesGuard`, and `CompanyGuard` protect routes.
- **`CostCalculatorModule`** — recursive recipe-cost engine with in-process 5-minute cache. Detects circular sub-recipe dependencies. No HTTP route yet — consumed by other services.
- **`PrismaModule`** — global singleton `PrismaService`; injected into all feature modules.

### Ingredient pricing rule
`IngredientPrice` rows are **append-only** — never update existing rows. Always insert a new row when a price changes. The latest price is the most recent `createdAt` for a given `ingredientId`.

### Web client (`apps/web`)
- **`apiClient`** (`lib/apiClient.ts`) — Axios instance with request interceptor (attaches Bearer token from `localStorage`) and response interceptor (automatic silent token refresh on 401, deduplicating concurrent refresh calls).
- Tokens stored in `localStorage` under keys `vivi_gourmet_access_token` / `vivi_gourmet_refresh_token`.
- All authenticated pages live under `app/(dashboard)/` which wraps in `AppShell` (sidebar + header layout).
- `AppProviders` wraps the app in React Query `QueryClientProvider` and any other global providers.

### Shared package (`packages/shared`)
Contains shared TypeScript types (`types.ts`), shared utilities (`utils.ts`), and an index barrel (`index.ts`). Consumed as `@vivi-gourmet/shared` by both apps. It must be built (`tsc`) before `api` or `web` start — handled automatically by the Turborepo pipeline and `predev` scripts.

## Key Prisma Schema Facts

- `RecipeItem` must reference **either** `ingredientId` or `subRecipeId` — never both and never neither (validated in application code, not DB).
- `Recipe` supports recursive composition (sub-recipes). The cost calculator detects cycles at runtime using a visited `Set`.
- `Menu` / `MenuItem` model a public-facing menu (cardápio). `MenuItem.order` maps to column `sort_order`.
- Soft-delete pattern: `deletedAt` nullable timestamp on `User`, `Company`, `Ingredient`, `Recipe`, `Product`. Always filter `deletedAt: null` in queries for active records.
