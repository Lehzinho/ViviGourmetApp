# Vivi Gourmet — TODO

> Gerado em 15/05/2026. Atualizar conforme tarefas forem concluídas.
> Usar junto com `CLAUDE.md` e `.claude/rules/git-workflow.md`.

## Como usar
- `[ ]` = pendente | `[x]` = concluído | `[-]` = em progresso
- Cada bloco tem o nome da branch sugerida no formato `feature/<nome>`
- Sempre seguir o git workflow obrigatório do CLAUDE.md antes de iniciar

---

## 🔴 PRIORIDADE 1 — Receitas (core do produto)

### API — RecipesModule `feature/api-recipes-module`
- [ ] Criar `apps/api/src/recipes/recipes.module.ts`
- [ ] Criar `apps/api/src/recipes/recipes.service.ts`
    - [ ] `create(companyId, dto)` — criar receita com itens (ingredientes e sub-receitas)
    - [ ] `findAll(companyId)` — listar receitas da empresa (soft-delete filter)
    - [ ] `findOne(companyId, id)` — buscar receita com itens expandidos
    - [ ] `update(companyId, id, dto)` — atualizar receita e itens
    - [ ] `remove(companyId, id)` — soft-delete
- [ ] Criar `apps/api/src/recipes/recipes.controller.ts`
    - [ ] `POST /recipes` — criar
    - [ ] `GET /recipes` — listar
    - [ ] `GET /recipes/:id` — detalhar
    - [ ] `PATCH /recipes/:id` — atualizar
    - [ ] `DELETE /recipes/:id` — deletar
    - [ ] Todos protegidos com `JwtAuthGuard` + `CompanyGuard`
- [ ] Criar DTOs em `apps/api/src/recipes/dto/`
    - [ ] `create-recipe.dto.ts` (nome, rendimento, unidade, itens[])
    - [ ] `update-recipe.dto.ts`
    - [ ] `recipe-item.dto.ts` (ingredientId OU subRecipeId + quantidade)
- [ ] Criar `apps/api/src/recipes/recipes.service.spec.ts`
- [ ] Registrar `RecipesModule` no `AppModule`

### API — CostCalculator HTTP `feature/api-cost-calculator-route`
- [ ] Criar `apps/api/src/cost-calculator/cost-calculator.controller.ts`
    - [ ] `GET /cost-calculator/recipe/:id` — retornar custo total da receita
    - [ ] Protegido com `JwtAuthGuard` + `CompanyGuard`
- [ ] Registrar controller no `CostCalculatorModule`

### Web — Receitas `feature/web-receitas`
- [ ] Criar `apps/web/hooks/useRecipes.ts`
    - [ ] `useRecipes()` — listar receitas (React Query)
    - [ ] `useRecipe(id)` — detalhar receita
    - [ ] `useCreateRecipe()` — mutation criar
    - [ ] `useUpdateRecipe()` — mutation atualizar
    - [ ] `useDeleteRecipe()` — mutation deletar
- [ ] Criar `apps/web/types/recipes.ts`
- [ ] Criar componentes em `apps/web/components/recipes/`
    - [ ] `RecipeTable.tsx` — tabela com nome, rendimento, custo calculado
    - [ ] `RecipeModal.tsx` — modal criar receita (com seletor de ingredientes/sub-receitas)
    - [ ] `EditRecipeModal.tsx` — modal editar
    - [ ] `DeleteRecipeDialog.tsx` — confirmação de exclusão
    - [ ] `RecipeItemForm.tsx` — linha de item (ingrediente ou sub-receita + quantidade)
    - [ ] `RecipeCostCard.tsx` — card com custo total + custo por porção
    - [ ] `index.ts` — barrel export
- [ ] Implementar `apps/web/app/(dashboard)/receitas/page.tsx`

---

## 🟠 PRIORIDADE 2 — Cardápio

### API — MenusModule `feature/api-menus-module`
- [ ] Criar `apps/api/src/menus/menus.module.ts`
- [ ] Criar `apps/api/src/menus/menus.service.ts`
    - [ ] `create(companyId, dto)` — criar cardápio
    - [ ] `findAll(companyId)` — listar cardápios
    - [ ] `findOne(companyId, id)` — detalhar com itens
    - [ ] `update(companyId, id, dto)` — atualizar
    - [ ] `remove(companyId, id)` — soft-delete
    - [ ] `addItem(companyId, menuId, dto)` — adicionar item ao cardápio
    - [ ] `removeItem(companyId, menuId, itemId)` — remover item
    - [ ] `reorderItems(companyId, menuId, order[])` — reordenar (sort_order)
- [ ] Criar `apps/api/src/menus/menus.controller.ts`
    - [ ] `POST /menus`
    - [ ] `GET /menus`
    - [ ] `GET /menus/:id`
    - [ ] `PATCH /menus/:id`
    - [ ] `DELETE /menus/:id`
    - [ ] `POST /menus/:id/items`
    - [ ] `DELETE /menus/:id/items/:itemId`
    - [ ] `PATCH /menus/:id/items/reorder`
- [ ] Criar DTOs em `apps/api/src/menus/dto/`
    - [ ] `create-menu.dto.ts`
    - [ ] `update-menu.dto.ts`
    - [ ] `create-menu-item.dto.ts` (productId, preço de venda, sort_order)
    - [ ] `reorder-items.dto.ts`
- [ ] Criar `apps/api/src/menus/menus.service.spec.ts`
- [ ] Registrar `MenusModule` no `AppModule`

### Web — Cardápio `feature/web-cardapio`
- [ ] Criar `apps/web/hooks/useMenus.ts`
- [ ] Criar `apps/web/types/menus.ts`
- [ ] Criar componentes em `apps/web/components/menus/`
    - [ ] `MenuTable.tsx`
    - [ ] `MenuModal.tsx`
    - [ ] `EditMenuModal.tsx`
    - [ ] `DeleteMenuDialog.tsx`
    - [ ] `MenuItemList.tsx` — lista de itens com drag-and-drop para reordenar
    - [ ] `MenuItemForm.tsx`
    - [ ] `index.ts`
- [ ] Implementar `apps/web/app/(dashboard)/cardapio/page.tsx`

---

## 🟡 PRIORIDADE 3 — Despesas Operacionais

### API — ExpensesModule `feature/api-expenses-module`
- [ ] Definir modelo Prisma para `Expense` (schema a decidir)
    - [ ] Campos sugeridos: `id`, `companyId`, `name`, `amount`, `category`, `recurrence`, `date`, `deletedAt`
    - [ ] Rodar `npm run db:migrate -w @vivi-gourmet/api`
- [ ] Criar `apps/api/src/expenses/expenses.module.ts`
- [ ] Criar `apps/api/src/expenses/expenses.service.ts`
    - [ ] CRUD completo com filtro por período
- [ ] Criar `apps/api/src/expenses/expenses.controller.ts`
    - [ ] `POST /expenses`
    - [ ] `GET /expenses` (query: `?from=&to=`)
    - [ ] `PATCH /expenses/:id`
    - [ ] `DELETE /expenses/:id`
- [ ] Criar DTOs
- [ ] Registrar `ExpensesModule` no `AppModule`

### Web — Despesas `feature/web-despesas`
- [ ] Criar `apps/web/hooks/useExpenses.ts`
- [ ] Criar `apps/web/types/expenses.ts`
- [ ] Criar componentes em `apps/web/components/expenses/`
    - [ ] `ExpenseTable.tsx`
    - [ ] `ExpenseModal.tsx`
    - [ ] `EditExpenseModal.tsx`
    - [ ] `DeleteExpenseDialog.tsx`
    - [ ] `ExpenseSummaryCard.tsx` — total mensal
    - [ ] `index.ts`
- [ ] Implementar `apps/web/app/(dashboard)/despesas/page.tsx`

---

## 🟢 PRIORIDADE 4 — Dashboard e Auth

### Web — Dashboard com dados reais `feature/web-dashboard`
- [x] Definir quais KPIs mostrar (ex: receitas cadastradas, custo médio, produtos, despesas do mês)
- [x] Criar componentes em `apps/web/components/dashboard/`
    - [x] `KpiCard.tsx` — card genérico de métrica
    - [x] `RecentRecipesList.tsx`
    - [x] `TopProductsList.tsx`
    - [x] `ExpensesSummaryWidget.tsx`
- [x] Implementar `apps/web/app/(dashboard)/dashboard/page.tsx` com dados reais via hooks

### Web — Proteção de rotas `feature/web-auth-middleware`
- [ ] Criar `apps/web/middleware.ts` na raiz do app
    - [ ] Redirecionar para `/login` se não houver token válido
    - [ ] Redirecionar para `/dashboard` se já autenticado e acessar `/login`
- [ ] Verificar se `app/(dashboard)/layout.tsx` já valida autenticação no client
- [ ] Remover uso de mock data (`data/mocks/ingredients.mock.ts`) substituindo por dados reais da API

---

## 🔵 PRIORIDADE 5 — Qualidade e Deploy

### Testes
- [ ] Revisar cobertura de `auth.service.spec.ts`
- [ ] Revisar cobertura de `cost-calculator.service.spec.ts`
- [ ] Revisar cobertura de `ingredients.service.spec.ts`
- [ ] Revisar cobertura de `products.service.spec.ts`
- [ ] Adicionar testes para `recipes.service.spec.ts` (criar junto com o módulo)
- [ ] Adicionar testes para `menus.service.spec.ts`
- [ ] Adicionar testes para `expenses.service.spec.ts`

### Validações e robustez
- [ ] Garantir que todos os DTOs usam `class-validator`
- [ ] Adicionar global `ValidationPipe` no `main.ts` (se ainda não tiver)
- [ ] Revisar mensagens de erro padronizadas na API

### Deploy (Vercel + Railway/Render)
- [ ] Configurar variáveis de ambiente de produção
- [ ] Verificar `.vercel/project.json` (já existe no web)
- [ ] Configurar deploy da API (Railway ou Render)
- [ ] Configurar banco de dados de produção (PostgreSQL gerenciado)
- [ ] Rodar migrações em produção com `db:migrate`

---

## 📝 Decisões pendentes (a discutir antes de implementar)

- [ ] Modelo de `Expense`: recorrente (aluguel, luz) vs avulso? Categorias fixas ou livres?
- [ ] `Menu`: um produto pode estar em múltiplos cardápios?
- [ ] Dashboard: quais métricas são mais importantes para o MVP?
- [ ] Precificação: markup é definido por produto ou por cardápio?