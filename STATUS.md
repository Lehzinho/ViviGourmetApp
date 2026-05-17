# Vivi Gourmet — Status do Projeto

> Gerado em 17/05/2026. Substitui TODO.md (que está defasado desde 15/05/2026).

---

## Resumo executivo

O projeto está **muito mais avançado do que o TODO.md indica**. Todas as prioridades 1, 2 e 3 do TODO (Receitas, Cardápio, Despesas) foram implementadas mas nunca marcadas como concluídas. O TODO deve ser descartado ou reescrito.

---

## ✅ 100% Implementado e funcionando

### Infraestrutura
- **Turborepo monorepo** — pipeline correto, `predev` builda `packages/shared` antes dos apps
- **Prisma + PostgreSQL** — schema com todos os modelos, migrations versionadas
- **ValidationPipe global** — `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` em `main.ts`
- **CORS** — configurado via `WEB_ORIGIN` env var
- **Multi-tenancy** — `companyId` em todos os módulos, guards `JwtAuthGuard` + `CompanyGuard`

### API — Módulos registrados no AppModule
| Módulo | Controller(s) | Service | Spec | DTOs |
|--------|--------------|---------|------|------|
| `AuthModule` | `auth.controller.ts` | ✅ | ✅ | login, register, refresh |
| `CostCalculatorModule` | `cost-calculator.controller.ts` (`GET /cost-calculator/recipe/:id`) | ✅ | ✅ | — |
| `IngredientsModule` | `ingredients.controller.ts` | ✅ | ✅ | create-raw-material, create-semi-finished, add-price, update |
| `RecipesModule` | `recipes.controller.ts` | ✅ | ✅ | create-recipe, update-recipe, recipe-item |
| `ProductsModule` | `products.controller.ts` | ✅ | ✅ | create-product, update-product |
| `ExpensesModule` | `expenses.controller.ts` | ✅ | ✅ | create-expense, update-expense, filter-expenses |
| `MenusModule` | `menus.controller.ts` | ✅ | ✅ | create-menu, update-menu, add-menu-item, update-menu-item, reorder-items |
| `CustomersModule` | `customers.controller.ts` + `orders.controller.ts` | ✅ | ✅ | 7 DTOs |
| `DashboardModule` | `dashboard.controller.ts` | ✅ | — | — |
| `PrismaModule` | — | ✅ | — | — |

### Web — Páginas completas
| Rota | Status |
|------|--------|
| `/` | ✅ Redireciona para `/dashboard` |
| `/login` | ✅ Formulário com refresh token |
| `/dashboard` | ✅ KPIs reais, receitas recentes, top produtos, widget de despesas |
| `/ingredientes` | ✅ CRUD completo, preço histórico, custo calculado, semi-acabados |
| `/receitas` | ✅ CRUD completo, seletor de ingredientes/sub-receitas, custo calculado |
| `/produtos` | ✅ CRUD completo, margem de lucro, `ProductPricingCard` |
| `/despesas` | ✅ CRUD completo, filtros por período/categoria, `ExpenseSummaryCard` |
| `/cardapio` | ✅ CRUD de cardápios + painel de itens (adicionar/remover/reordenar) |
| `/clientes` | ✅ Tabela com busca/paginação, `CustomerProfilePage` com histórico de pedidos |
| `/clientes/[id]` | ✅ Perfil completo: KPIs, pedidos, nova venda inline |

### Web — Hooks, tipos e componentes
- **Hooks**: `useDashboard`, `useIngredients`, `useRecipes`, `useProducts`, `useExpenses`, `useMenus`, `useCustomers`, `useOrders`, `useMe`
- **Types**: `dashboard`, `ingredients`, `recipes`, `products`, `expenses`, `menus`, `customers`
- **Layout**: `AppShell`, `Sidebar`, `Header`, `PageHeader`, `nav-icons` (todos os ícones)
- **Componentes por módulo**: todos com `index.ts` barrel export

---

## ⚠️ Parcialmente implementado / a verificar

### Testes (spec files existem mas cobertura não foi revisada)
Os seguintes arquivos existem mas a qualidade/cobertura não foi auditada:
- `auth.service.spec.ts`
- `cost-calculator.service.spec.ts`
- `ingredients.service.spec.ts`
- `products.service.spec.ts`
- `expenses.service.spec.ts`
- `menus.service.spec.ts`
- `recipes.service.spec.ts`
- `customers.service.spec.ts` — 12 testes, executados e passando

### Drag-and-drop em Cardápio
`MenuItemsPanel` tem reordenamento de itens via API (`PATCH /menus/:id/items/reorder`), mas a UI pode não ter drag-and-drop visual — pode ser apenas botões de ordem. Não verificado em execução.

### CostCalculator — rota de produto
O controller expõe `GET /cost-calculator/recipe/:id` mas **não** expõe `GET /cost-calculator/product/:id`. O custo de produto é calculado internamente pelos outros módulos (dashboard, products service). Pode ser uma limitação intencional.

---

## ❌ Não implementado (genuinamente pendente)

### Deploy / Produção
- Variáveis de ambiente de produção não configuradas
- Deploy da API (Railway ou Render) não configurado
- Banco de dados de produção não provisionado
- Migrações em produção não rodadas

### Qualidade
- Auditoria de cobertura de testes pendente
- Mensagens de erro da API não padronizadas (sem formato global de `ApiException`)

### Funcionalidades futuras (fora do escopo atual)
- Relatórios / exportação (PDF, CSV)
- Notificações
- Múltiplos usuários por empresa com controle de permissão na UI
- Página de configurações de conta/empresa

---

## 🚨 Inconsistências identificadas

### 1. TODO.md completamente defasado
O `TODO.md` foi gerado em 15/05/2026 e marca como `[ ]` pendente **tudo** que já foi implementado:
- Prioridade 1 (Receitas): implementada — `[ ]` no TODO
- Prioridade 2 (Cardápio): implementada — `[ ]` no TODO
- Prioridade 3 (Despesas): implementada — `[ ]` no TODO
- Módulo de Clientes: implementado — **sequer aparece** no TODO

**Ação recomendada:** substituir `TODO.md` por este `STATUS.md` ou reescrever com foco apenas no que falta.

### 2. CLAUDE.md desatualizado
A seção "API module layout" do `CLAUDE.md` cita apenas `AuthModule`, `CostCalculatorModule` e `PrismaModule`. Os outros 7 módulos (`IngredientsModule`, `RecipesModule`, `ProductsModule`, `ExpensesModule`, `MenusModule`, `CustomersModule`, `DashboardModule`) não estão documentados.

### 3. Soft-delete inconsistente no schema
`Menu` não tem campo `deletedAt` (ao contrário de `Ingredient`, `Recipe`, `Product`, `Customer`). O `dashboard.service.ts` faz `menu.count({})` sem filtro de `deletedAt`, o que seria consistente com a ausência do campo — mas cria assimetria com os outros modelos.

---

## Próximos passos sugeridos (por prioridade)

1. **Rodar e auditar os testes** — `npm run test -w @vivi-gourmet/api` e revisar cobertura
2. **Configurar deploy** — Railway/Render para API, Vercel já tem `.vercel/project.json`
3. **Atualizar CLAUDE.md** — documentar todos os módulos existentes
4. **Verificar drag-and-drop** no `MenuItemsPanel` em execução real
5. **Relatórios** — próximo módulo de maior valor para o usuário final
