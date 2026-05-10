# Vivi Gourmet

Monorepo SaaS de precificação com **Turborepo**, **Next.js 14** (App Router, Styled Components, React Query), **NestJS** (Prisma, PostgreSQL, JWT) e pacote **`@vivi-gourmet/shared`**.

## Pré-requisitos

- **Node.js 20 LTS** (recomendado)
- **npm** compatível com workspaces (o repositório define `packageManager`: npm 11.x no `package.json` da raiz)
- **Docker Desktop** (PostgreSQL 15 e pgAdmin no `docker-compose.yml`)

## Início rápido

Na raiz do repositório (`Vivi Gourmet`):

### 1. Variáveis de ambiente

Copie o modelo e ajuste valores sensíveis em produção:

**Windows (cmd/PowerShell):**

```bash
copy .env.example apps\api\.env
```

**macOS / Linux:**

```bash
cp .env.example apps/api/.env
```

Opcional para o front apontar para a API (recomendado em desenvolvimento):

**Windows:**

```bash
copy .env.example apps\web\.env.local
```

Edite `apps/web/.env.local` e descomente ou defina:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Se não criar o arquivo, o cliente HTTP da web usa `http://localhost:3001` por padrão no código.

### 2. Subir o PostgreSQL

```bash
docker compose up -d
```

Aguarde o serviço ficar **healthy** (o pgAdmin só sobe depois).

- **Postgres:** host `localhost`, porta **`5433`** → dentro do container continua `5432`. A porta **5433** evita conflito com um PostgreSQL já instalado na máquina na 5432.
- **Credenciais padrão** (alinhadas ao `.env.example`): usuário `vivi`, senha `vivi`, banco `vivi_gourmet`.
- **pgAdmin:** http://localhost:5050 — e-mail `admin@vivigourmet.local`, senha `admin` (veja `docker-compose.yml`).

### 3. Instalar dependências

```bash
npm install
```

### 4. Sincronizar o schema do Prisma

Com o banco no ar e `apps/api/.env` com `DATABASE_URL` apontando para `localhost:5433`:

```bash
cd apps\api
npx prisma generate
npx prisma db push
cd ..\..
```

Ou, a partir da raiz:

```bash
npm run db:push -w @vivi-gourmet/api
```

Para migrações versionadas no futuro, use `npm run db:migrate -w @vivi-gourmet/api`.

### 5. Iniciar web + API em desenvolvimento

Na **raiz**:

```bash
npm run dev
```

Isso executa `turbo run dev`: **watch** do pacote `shared`, **NestJS** em modo watch e **Next.js**.

| Serviço | URL |
|---------|-----|
| **Web (Next.js)** | http://localhost:3000 |
| **API (NestJS)** | http://localhost:3001 |
| **Health check** | http://localhost:3001/health |

Fluxo sugerido: abra http://localhost:3000 → **Abrir painel** → `/dashboard` (a visão geral consulta a API via React Query).

### Parar os containers Docker

```bash
docker compose down
```

(Dados do Postgres ficam no volume até você usar `docker compose down -v`.)

---

## Variáveis de ambiente (referência)

| Variável | Onde | Uso |
|----------|------|-----|
| `DATABASE_URL` | `apps/api/.env` | Prisma e conexão PostgreSQL (use porta **5433** com o `docker-compose` deste repo) |
| `JWT_SECRET` | `apps/api/.env` | Assinatura dos access tokens JWT |
| `NEXTAUTH_SECRET` | `apps/api/.env` / futuro front | Reservado para NextAuth na web, se for configurado |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | Base URL da API para `axios` (`apiClient`) |
| `WEB_ORIGIN` | `apps/api/.env` (opcional) | CORS da API (padrão no código: `http://localhost:3000`) |
| `PORT` | `apps/api/.env` (opcional) | Porta da API (padrão: `3001`) |

**PowerShell:** se você definiu manualmente `$env:DATABASE_URL` na sessão, ela **sobrescreve** o `apps/api/.env`. Antes de `prisma db push` / `migrate`, use:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

---

## Scripts (raiz)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Turborepo: `shared` (tsc watch), `web` (Next dev), `api` (Nest watch) |
| `npm run build` | Build de todos os workspaces |
| `npm run lint` | Lint / typecheck onde configurado |

### Scripts úteis na API (`apps/api`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev -w @vivi-gourmet/api` | Só a API |
| `npm run db:push -w @vivi-gourmet/api` | `prisma db push` |
| `npm run db:migrate -w @vivi-gourmet/api` | `prisma migrate dev` |
| `npm run test -w @vivi-gourmet/api` | Testes Jest |

### Scripts úteis na web (`apps/web`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev -w @vivi-gourmet/web` | Só o Next.js |

---

## O que existe hoje na API (rotas HTTP)

- **`GET /health`** — status do serviço  
- **`POST /auth/register`**, **`/auth/login`**, **`/auth/refresh`**, **`/auth/logout`** — autenticação JWT + refresh token  

O Prisma já modela **ingredientes**, **receitas**, **produtos**, etc.; rotas REST de CRUD para esses recursos **ainda não** estão expostas — use o schema e serviços como base para novos controllers.

Serviços internos sem rota HTTP dedicada incluem, por exemplo, **`CostCalculatorService`** (cálculo de custo de receita).

---

## Estrutura do monorepo

```text
apps/
  web/           Next.js 14 — dashboard (`/dashboard`, `/ingredientes`, …), Styled Components, React Query
  api/           NestJS — auth, health, Prisma, módulos de domínio
packages/
  shared/        Tipos e utilitários compartilhados
```

Arquivos de orquestração na raiz: `turbo.json`, `tsconfig.base.json`, `docker-compose.yml`, `.env.example`, `package.json` (`packageManager` exigido pelo Turborepo 2.x).

---

## Problemas comuns

- **`P1000` (autenticação Prisma):** confira se o `DATABASE_URL` usa a porta **5433** e se `docker compose up -d` está rodando; confira se não há outro Postgres “na frente” na mesma porta configurada na URL.  
- **Painel mostra API offline:** confirme que a API está em `3001` e que o front usa `NEXT_PUBLIC_API_URL` correto (ou o padrão).  
- **Primeiro `npm run dev` demora:** os pacotes `web` e `api` rodam `predev` que compila o `shared` uma vez.
