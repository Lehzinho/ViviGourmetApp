# Pricing Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o modelo de precificação para suportar Matéria-prima (RAW), Semiacabado (SEMI_FINISHED) e Produto Final, substituindo o `subRecipeId` por tipos explícitos no `Ingredient`.

**Architecture:** `RecipeItem.subRecipeId` é eliminado; semiacabados são `Ingredient(SEMI_FINISHED)` com `compositionRecipeId` apontando para uma `Recipe(COMPOSITION)`. O `CostCalculatorService` resolve custo por tipo do ingrediente em vez de perseguir `subRecipeId`. A página `/ingredientes` do frontend é conectada à API real (substituindo mocks).

**Tech Stack:** Prisma 6, NestJS 10, class-validator, TanStack Query v5, Styled Components, TypeScript 5.

---

## File Map

**Modify:**
- `apps/api/prisma/schema.prisma` — enums + campos novos, remoção de subRecipeId (2 fases)
- `apps/api/src/cost-calculator/cost-calculator.service.ts` — lógica por tipo
- `apps/api/src/cost-calculator/cost-calculator.service.spec.ts` — testes novos
- `apps/api/src/app.module.ts` — registrar IngredientsModule
- `apps/web/types/ingredients.ts` — alinhar tipos ao backend
- `apps/web/app/(dashboard)/ingredientes/page.tsx` — trocar state local por React Query
- `apps/web/lib/navigation.ts` — adicionar entradas de nav

**Create:**
- `apps/api/prisma/migrate-subrecipe-to-semifinished.ts` — script de migração de dados
- `apps/api/src/ingredients/ingredients.module.ts`
- `apps/api/src/ingredients/ingredients.controller.ts`
- `apps/api/src/ingredients/ingredients.service.ts`
- `apps/api/src/ingredients/ingredients.service.spec.ts`
- `apps/api/src/ingredients/dto/create-raw-material.dto.ts`
- `apps/api/src/ingredients/dto/add-price.dto.ts`
- `apps/api/src/ingredients/dto/create-semi-finished.dto.ts`
- `apps/web/hooks/useIngredients.ts` — React Query hooks

---

## Task 1: Schema — Additive Changes (Fase 1)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Adicionar enums e campos novos ao schema (mantendo campos antigos)**

Substituir o bloco de enums e os modelos `Ingredient`, `Recipe` e `RecipeItem` em `apps/api/prisma/schema.prisma` pelo conteúdo abaixo. **Não remover** `subRecipeId` nem `usedAsSubRecipeIn` ainda — isso é feito na Task 3.

```prisma
// --- Enums existentes (manter como estão) ---
enum CompanyUserRole {
  OWNER
  ADMIN
  MEMBER
}

enum IngredientUnit {
  GRAM
  ML
  UNIT
}

// NOVOS enums
enum IngredientType {
  RAW
  SEMI_FINISHED
}

enum RecipeType {
  COMPOSITION
  PRODUCT
}

enum ExpenseType {
  FIXED
  VARIABLE
}

enum ExpensePeriod {
  MONTHLY
  WEEKLY
}
```

Em `model Ingredient`, adicionar dois campos após `unit`:

```prisma
model Ingredient {
  id                  String         @id @default(cuid())
  companyId           String
  name                String
  unit                IngredientUnit
  type                IngredientType @default(RAW)
  compositionRecipeId String?        @unique
  createdAt           DateTime       @default(now())
  deletedAt           DateTime?

  company             Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  prices              IngredientPrice[]
  recipeItems         RecipeItem[]
  compositionRecipe   Recipe?          @relation("IngredientComposition", fields: [compositionRecipeId], references: [id])

  @@index([companyId])
  @@index([companyId, deletedAt])
  @@index([companyId, name])
  @@index([companyId, type])
}
```

Em `model Recipe`, adicionar campo `type` após `name`:

```prisma
model Recipe {
  id          String         @id @default(cuid())
  companyId   String
  name        String
  type        RecipeType     @default(PRODUCT)
  yield       Decimal        @db.Decimal(14, 4)
  yieldUnit   IngredientUnit
  createdAt   DateTime       @default(now())
  deletedAt   DateTime?

  company Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  items             RecipeItem[] @relation("RecipeComposition")
  usedAsSubRecipeIn RecipeItem[] @relation("RecipeAsSubrecipe")
  definedIngredient Ingredient?  @relation("IngredientComposition")
  products          Product[]

  @@index([companyId])
  @@index([companyId, deletedAt])
  @@index([companyId, name])
  @@index([companyId, type])
}
```

`RecipeItem` permanece igual por enquanto (ingredientId ainda nullable, subRecipeId ainda presente).

- [ ] **Step 2: Aplicar schema ao banco**

```powershell
npm run db:push -w @vivi-gourmet/api
```

Saída esperada: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Confirmar que Prisma Client foi gerado sem erros**

```powershell
npm run db:generate -w @vivi-gourmet/api
```

Saída esperada: sem erros. Verificar que `IngredientType` e `RecipeType` aparecem nos imports do cliente gerado em `node_modules/@prisma/client`.

---

## Task 2: Script de Migração de Dados

**Files:**
- Create: `apps/api/prisma/migrate-subrecipe-to-semifinished.ts`

- [ ] **Step 1: Criar o script de migração**

Criar `apps/api/prisma/migrate-subrecipe-to-semifinished.ts`:

```typescript
import { PrismaClient, IngredientType, RecipeType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const itemsWithSubRecipe = await prisma.recipeItem.findMany({
    where: { subRecipeId: { not: null } },
    include: {
      subRecipe: true,
    },
  });

  if (itemsWithSubRecipe.length === 0) {
    console.log("Nenhum RecipeItem com subRecipeId encontrado. Nada a migrar.");
    return;
  }

  console.log(`Migrando ${itemsWithSubRecipe.length} RecipeItem(s) com subRecipeId...`);

  // Agrupar por subRecipeId para não criar duplicatas se a mesma sub-receita
  // for usada em múltiplos RecipeItems
  const recipeIdToIngredientId = new Map<string, string>();

  for (const item of itemsWithSubRecipe) {
    const subRecipe = item.subRecipe!;

    let semifinishedIngredientId = recipeIdToIngredientId.get(subRecipe.id);

    if (!semifinishedIngredientId) {
      // Verificar se já existe um SEMI_FINISHED com esse compositionRecipeId
      const existing = await prisma.ingredient.findUnique({
        where: { compositionRecipeId: subRecipe.id },
      });

      if (existing) {
        semifinishedIngredientId = existing.id;
      } else {
        const newIngredient = await prisma.ingredient.create({
          data: {
            companyId: subRecipe.companyId,
            name: subRecipe.name,
            unit: subRecipe.yieldUnit,
            type: IngredientType.SEMI_FINISHED,
            compositionRecipeId: subRecipe.id,
          },
        });
        semifinishedIngredientId = newIngredient.id;

        // Marcar a recipe como COMPOSITION
        await prisma.recipe.update({
          where: { id: subRecipe.id },
          data: { type: RecipeType.COMPOSITION },
        });

        console.log(`  Criado SEMI_FINISHED "${subRecipe.name}" (id: ${newIngredient.id})`);
      }

      recipeIdToIngredientId.set(subRecipe.id, semifinishedIngredientId);
    }

    // Atualizar o RecipeItem: setar ingredientId, zerar subRecipeId
    await prisma.recipeItem.update({
      where: { id: item.id },
      data: {
        ingredientId: semifinishedIngredientId,
        subRecipeId: null,
      },
    });

    console.log(`  RecipeItem ${item.id}: subRecipeId → ingredientId (${semifinishedIngredientId})`);
  }

  // Verificar que não restam RecipeItems sem ingredientId
  const orphaned = await prisma.recipeItem.count({
    where: { ingredientId: null },
  });
  if (orphaned > 0) {
    throw new Error(`${orphaned} RecipeItem(s) ainda sem ingredientId após migração!`);
  }

  console.log("Migração concluída com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Executar o script de migração**

```powershell
cd "apps\api"
npx ts-node --project tsconfig.json prisma/migrate-subrecipe-to-semifinished.ts
cd ..\..
```

Saída esperada: `Migração concluída com sucesso.` (ou `Nenhum RecipeItem com subRecipeId encontrado.` se não há dados).

---

## Task 3: Schema — Breaking Changes (Fase 2)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Remover subRecipeId e tornar ingredientId obrigatório**

Substituir o modelo `RecipeItem` completo:

```prisma
model RecipeItem {
  id           String         @id @default(cuid())
  companyId    String
  recipeId     String
  ingredientId String
  quantity     Decimal        @db.Decimal(14, 4)
  unit         IngredientUnit

  company    Company    @relation(fields: [companyId], references: [id], onDelete: Cascade)
  recipe     Recipe     @relation("RecipeComposition", fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Restrict)

  @@index([companyId])
  @@index([companyId, recipeId])
  @@index([recipeId])
  @@index([ingredientId])
}
```

Substituir o modelo `Recipe` removendo `usedAsSubRecipeIn`:

```prisma
model Recipe {
  id          String         @id @default(cuid())
  companyId   String
  name        String
  type        RecipeType     @default(PRODUCT)
  yield       Decimal        @db.Decimal(14, 4)
  yieldUnit   IngredientUnit
  createdAt   DateTime       @default(now())
  deletedAt   DateTime?

  company           Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  items             RecipeItem[] @relation("RecipeComposition")
  definedIngredient Ingredient?  @relation("IngredientComposition")
  products          Product[]

  @@index([companyId])
  @@index([companyId, deletedAt])
  @@index([companyId, name])
  @@index([companyId, type])
}
```

- [ ] **Step 2: Aplicar breaking changes ao banco**

O `db push` vai detectar a remoção de `subRecipeId` e a mudança de nullable para required em `ingredientId`. Como fizemos a migração de dados na Task 2, isso é seguro. Caso haja dados residuais, usar `--accept-data-loss` (só elimina dados na coluna removida).

```powershell
npm run db:push -w @vivi-gourmet/api
```

Se o comando pedir confirmação sobre perda de dados (coluna `subRecipeId`), digitar `y`.

Saída esperada: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Regenerar o Prisma Client e verificar compilação**

```powershell
npm run db:generate -w @vivi-gourmet/api
npx tsc --noEmit --project "apps\api\tsconfig.json"
```

Saída esperada: sem erros de tipagem.

---

## Task 4: Refatorar CostCalculatorService

**Files:**
- Modify: `apps/api/src/cost-calculator/cost-calculator.service.ts`
- Modify: `apps/api/src/cost-calculator/cost-calculator.service.spec.ts`
- Modify: `apps/api/src/cost-calculator/cost-calculator.types.ts`

- [ ] **Step 1: Atualizar os tipos**

Substituir `apps/api/src/cost-calculator/cost-calculator.types.ts`:

```typescript
export type CostBreakdownItem = {
  name: string;
  type: "raw" | "semi_finished";
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
};

export type CostResult = {
  totalCost: number;
  costPerUnit: number;
  breakdown: CostBreakdownItem[];
};
```

- [ ] **Step 2: Escrever os testes antes de alterar o service**

Substituir `apps/api/src/cost-calculator/cost-calculator.service.spec.ts` inteiro:

```typescript
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { IngredientType, IngredientUnit } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CostCalculatorService } from "./cost-calculator.service";

describe("CostCalculatorService", () => {
  let service: CostCalculatorService;
  let prisma: {
    ingredient: { findFirst: jest.Mock };
    ingredientPrice: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      ingredient: { findFirst: jest.fn() },
      ingredientPrice: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostCalculatorService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CostCalculatorService);
  });

  afterEach(() => jest.clearAllMocks());

  const RAW_FLOUR = {
    id: "ing-flour",
    companyId: "co1",
    name: "Farinha",
    unit: IngredientUnit.GRAM,
    type: IngredientType.RAW,
    deletedAt: null,
    compositionRecipeId: null,
    compositionRecipe: null,
  };

  const SEMI_MASSA = {
    id: "ing-massa",
    companyId: "co1",
    name: "Massa de Pizza",
    unit: IngredientUnit.GRAM,
    type: IngredientType.SEMI_FINISHED,
    deletedAt: null,
    compositionRecipeId: "rec-massa",
    compositionRecipe: {
      id: "rec-massa",
      companyId: "co1",
      yield: 1000,
      yieldUnit: IngredientUnit.GRAM,
      deletedAt: null,
      items: [
        {
          id: "ri-1",
          ingredientId: "ing-flour",
          quantity: 500,
          unit: IngredientUnit.GRAM,
          ingredient: RAW_FLOUR,
        },
      ],
    },
  };

  it("calculates cost per unit for a RAW ingredient", async () => {
    prisma.ingredient.findFirst.mockResolvedValue(RAW_FLOUR);
    prisma.ingredientPrice.findMany.mockResolvedValue([
      { ingredientId: "ing-flour", pricePerUnit: "0.005", createdAt: new Date() },
    ]);

    const result = await service.calculateIngredientCost("ing-flour", "co1");

    expect(result.costPerUnit).toBeCloseTo(0.005);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].type).toBe("raw");
    expect(result.breakdown[0].name).toBe("Farinha");
  });

  it("calculates cost per unit for a SEMI_FINISHED by summing its composition", async () => {
    prisma.ingredient.findFirst.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "ing-massa") return Promise.resolve(SEMI_MASSA);
      if (where.id === "ing-flour") return Promise.resolve(RAW_FLOUR);
      return Promise.resolve(null);
    });
    prisma.ingredientPrice.findMany.mockResolvedValue([
      { ingredientId: "ing-flour", pricePerUnit: "0.006", createdAt: new Date() },
    ]);

    const result = await service.calculateIngredientCost("ing-massa", "co1");

    // 500g farinha × 0.006 = 3.0 total; yield=1000g → 0.003/g
    expect(result.totalCost).toBeCloseTo(3.0);
    expect(result.costPerUnit).toBeCloseTo(0.003);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0].type).toBe("semi_finished");
    expect(result.breakdown[0].name).toBe("Massa de Pizza");
  });

  it("throws BadRequestException on circular SEMI_FINISHED dependencies", async () => {
    const circularA = {
      id: "a",
      companyId: "co1",
      name: "A",
      unit: IngredientUnit.GRAM,
      type: IngredientType.SEMI_FINISHED,
      deletedAt: null,
      compositionRecipeId: "rec-a",
      compositionRecipe: {
        id: "rec-a",
        companyId: "co1",
        yield: 1,
        yieldUnit: IngredientUnit.UNIT,
        deletedAt: null,
        items: [
          { id: "ri-a", ingredientId: "b", quantity: 1, unit: IngredientUnit.UNIT,
            ingredient: { id: "b", type: IngredientType.SEMI_FINISHED } },
        ],
      },
    };
    const circularB = {
      id: "b",
      companyId: "co1",
      name: "B",
      unit: IngredientUnit.GRAM,
      type: IngredientType.SEMI_FINISHED,
      deletedAt: null,
      compositionRecipeId: "rec-b",
      compositionRecipe: {
        id: "rec-b",
        companyId: "co1",
        yield: 1,
        yieldUnit: IngredientUnit.UNIT,
        deletedAt: null,
        items: [
          { id: "ri-b", ingredientId: "a", quantity: 1, unit: IngredientUnit.UNIT,
            ingredient: { id: "a", type: IngredientType.SEMI_FINISHED } },
        ],
      },
    };

    prisma.ingredient.findFirst.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "a") return Promise.resolve(circularA);
      if (where.id === "b") return Promise.resolve(circularB);
      return Promise.resolve(null);
    });
    prisma.ingredientPrice.findMany.mockResolvedValue([]);

    await expect(service.calculateIngredientCost("a", "co1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws NotFoundException when ingredient does not exist", async () => {
    prisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(service.calculateIngredientCost("missing", "co1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns cached result on second call (no extra DB queries)", async () => {
    prisma.ingredient.findFirst.mockResolvedValue(RAW_FLOUR);
    prisma.ingredientPrice.findMany.mockResolvedValue([
      { ingredientId: "ing-flour", pricePerUnit: "0.005", createdAt: new Date() },
    ]);

    await service.calculateIngredientCost("ing-flour", "co1");
    await service.calculateIngredientCost("ing-flour", "co1");

    expect(prisma.ingredient.findFirst).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Executar testes para verificar que falham (antes da implementação)**

```powershell
npm run test -w @vivi-gourmet/api -- --testPathPattern="cost-calculator"
```

Saída esperada: vários testes falham (métodos não encontrados / assinatura errada).

- [ ] **Step 4: Implementar o novo CostCalculatorService**

Substituir `apps/api/src/cost-calculator/cost-calculator.service.ts` inteiro:

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IngredientType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CostBreakdownItem, CostResult } from "./cost-calculator.types";

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CostCalculatorService {
  private readonly cache = new Map<string, { value: CostResult; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async calculateIngredientCost(ingredientId: string, companyId: string): Promise<CostResult> {
    const cacheKey = `${companyId}:${ingredientId}`;
    const entry = this.cache.get(cacheKey);
    if (entry && Date.now() < entry.expiresAt) {
      return this.cloneResult(entry.value);
    }
    const result = await this.computeIngredientInternal(ingredientId, companyId, new Set());
    this.cache.set(cacheKey, { value: this.cloneResult(result), expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  invalidateIngredientCache(ingredientId: string, companyId: string): void {
    this.cache.delete(`${companyId}:${ingredientId}`);
  }

  private async computeIngredientInternal(
    ingredientId: string,
    companyId: string,
    visited: Set<string>,
  ): Promise<CostResult> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, companyId, deletedAt: null },
      include: {
        compositionRecipe: {
          include: {
            items: {
              include: {
                ingredient: {
                  select: { id: true, name: true, unit: true, type: true },
                },
              },
            },
          },
        },
      },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient not found: ${ingredientId}`);
    }

    if (ingredient.type === IngredientType.RAW) {
      const priceMap = await this.getLatestPricePerUnit(companyId, [ingredientId]);
      const unitCost = priceMap.get(ingredientId);
      if (unitCost === undefined) {
        throw new BadRequestException(
          `No price history for ingredient ${ingredientId}`,
        );
      }
      return {
        totalCost: unitCost,
        costPerUnit: unitCost,
        breakdown: [
          {
            name: ingredient.name,
            type: "raw",
            quantity: 1,
            unit: ingredient.unit,
            unitCost,
            totalCost: unitCost,
          },
        ],
      };
    }

    // SEMI_FINISHED — recurse into compositionRecipe
    if (visited.has(ingredientId)) {
      throw new BadRequestException(
        `Circular dependency detected (ingredient ${ingredientId} visited twice)`,
      );
    }
    visited.add(ingredientId);
    try {
      const recipe = ingredient.compositionRecipe;
      if (!recipe) {
        throw new BadRequestException(
          `SEMI_FINISHED ingredient ${ingredientId} has no composition recipe`,
        );
      }
      const yieldTotal = this.toNumber(recipe.yield);
      if (yieldTotal <= 0) {
        throw new BadRequestException("Composition recipe yield must be greater than zero");
      }

      const rawIds = recipe.items
        .filter((i) => i.ingredient.type === IngredientType.RAW)
        .map((i) => i.ingredientId);
      const priceMap = await this.getLatestPricePerUnit(companyId, rawIds);

      let totalCost = 0;
      const breakdown: CostBreakdownItem[] = [];

      for (const item of recipe.items) {
        const qty = this.toNumber(item.quantity);
        const subResult = await this.resolveItemCost(item, companyId, priceMap, visited);
        const lineTotal = qty * subResult.unitCost;
        totalCost += lineTotal;
        breakdown.push({
          name: item.ingredient.name,
          type: item.ingredient.type === IngredientType.RAW ? "raw" : "semi_finished",
          quantity: qty,
          unit: item.unit,
          unitCost: subResult.unitCost,
          totalCost: lineTotal,
        });
      }

      const costPerUnit = totalCost / yieldTotal;
      return { totalCost, costPerUnit, breakdown };
    } finally {
      visited.delete(ingredientId);
    }
  }

  private async resolveItemCost(
    item: { ingredientId: string; ingredient: { type: IngredientType } },
    companyId: string,
    priceMap: Map<string, number>,
    visited: Set<string>,
  ): Promise<{ unitCost: number }> {
    if (item.ingredient.type === IngredientType.RAW) {
      const unitCost = priceMap.get(item.ingredientId);
      if (unitCost === undefined) {
        throw new BadRequestException(
          `No price history for ingredient ${item.ingredientId}`,
        );
      }
      return { unitCost };
    }
    const subResult = await this.computeIngredientInternal(item.ingredientId, companyId, visited);
    return { unitCost: subResult.costPerUnit };
  }

  private async getLatestPricePerUnit(
    companyId: string,
    ingredientIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (ingredientIds.length === 0) return map;

    const rows = await this.prisma.ingredientPrice.findMany({
      where: { companyId, ingredientId: { in: ingredientIds } },
      orderBy: { createdAt: "desc" },
    });

    for (const row of rows) {
      if (!map.has(row.ingredientId)) {
        map.set(row.ingredientId, this.toNumber(row.pricePerUnit));
      }
    }
    return map;
  }

  private cloneResult(r: CostResult): CostResult {
    return {
      totalCost: r.totalCost,
      costPerUnit: r.costPerUnit,
      breakdown: r.breakdown.map((b) => ({ ...b })),
    };
  }

  private toNumber(value: unknown): number {
    if (typeof value === "number") return value;
    return Number(value);
  }
}
```

- [ ] **Step 5: Executar testes e garantir que passam**

```powershell
npm run test -w @vivi-gourmet/api -- --testPathPattern="cost-calculator"
```

Saída esperada: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma \
        apps/api/prisma/migrate-subrecipe-to-semifinished.ts \
        apps/api/src/cost-calculator/cost-calculator.service.ts \
        apps/api/src/cost-calculator/cost-calculator.service.spec.ts \
        apps/api/src/cost-calculator/cost-calculator.types.ts
git commit -m "refactor(api): replace subRecipeId with IngredientType RAW/SEMI_FINISHED"
```

---

## Task 5: IngredientsModule — DTOs

**Files:**
- Create: `apps/api/src/ingredients/dto/create-raw-material.dto.ts`
- Create: `apps/api/src/ingredients/dto/add-price.dto.ts`
- Create: `apps/api/src/ingredients/dto/create-semi-finished.dto.ts`

- [ ] **Step 1: Criar DTO de matéria-prima**

Criar `apps/api/src/ingredients/dto/create-raw-material.dto.ts`:

```typescript
import { IsEnum, IsNumber, IsString, Min, MinLength } from "class-validator";
import { IngredientUnit } from "@prisma/client";

export class CreateRawMaterialDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;

  @IsNumber()
  @Min(0.0001)
  price!: number;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}
```

- [ ] **Step 2: Criar DTO de adição de preço**

Criar `apps/api/src/ingredients/dto/add-price.dto.ts`:

```typescript
import { IsNumber, Min } from "class-validator";

export class AddPriceDto {
  @IsNumber()
  @Min(0.0001)
  price!: number;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;
}
```

- [ ] **Step 3: Criar DTO de semiacabado**

Criar `apps/api/src/ingredients/dto/create-semi-finished.dto.ts`:

```typescript
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { IngredientUnit } from "@prisma/client";

class CompositionItemDto {
  @IsString()
  ingredientId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;
}

export class CreateSemiFinishedDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0.0001)
  yield!: number;

  @IsEnum(IngredientUnit)
  yieldUnit!: IngredientUnit;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CompositionItemDto)
  items!: CompositionItemDto[];
}
```

---

## Task 6: IngredientsModule — Service

**Files:**
- Create: `apps/api/src/ingredients/ingredients.service.ts`
- Create: `apps/api/src/ingredients/ingredients.service.spec.ts`

- [ ] **Step 1: Escrever os testes antes do service**

Criar `apps/api/src/ingredients/ingredients.service.spec.ts`:

```typescript
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { IngredientType, IngredientUnit, RecipeType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { IngredientsService } from "./ingredients.service";

describe("IngredientsService", () => {
  let service: IngredientsService;
  let prisma: {
    ingredient: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    ingredientPrice: { create: jest.Mock; findMany: jest.Mock };
    recipe: { create: jest.Mock };
    recipeItem: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      ingredient: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      ingredientPrice: { create: jest.fn(), findMany: jest.fn() },
      recipe: { create: jest.fn() },
      recipeItem: { createMany: jest.fn() },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(IngredientsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("createRawMaterial", () => {
    it("creates ingredient and price row in a transaction", async () => {
      const createdIngredient = {
        id: "ing-1",
        companyId: "co1",
        name: "Farinha",
        unit: IngredientUnit.GRAM,
        type: IngredientType.RAW,
        compositionRecipeId: null,
        deletedAt: null,
        createdAt: new Date(),
      };

      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          ingredient: {
            create: jest.fn().mockResolvedValue(createdIngredient),
          },
          ingredientPrice: {
            create: jest.fn().mockResolvedValue({}),
          },
        }),
      );

      prisma.ingredient.findFirst.mockResolvedValue({
        ...createdIngredient,
        prices: [{ pricePerUnit: "0.005", createdAt: new Date() }],
        compositionRecipe: null,
      });

      const result = await service.createRawMaterial(
        { name: "Farinha", unit: IngredientUnit.GRAM, price: 25, quantity: 5000 },
        "co1",
      );

      expect(result.type).toBe(IngredientType.RAW);
      expect(result.name).toBe("Farinha");
    });
  });

  describe("addPrice", () => {
    it("throws NotFoundException when ingredient not found or not RAW", async () => {
      prisma.ingredient.findFirst.mockResolvedValue(null);

      await expect(
        service.addPrice("missing", { price: 10, quantity: 100 }, "co1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("inserts a new IngredientPrice row", async () => {
      prisma.ingredient.findFirst.mockResolvedValue({
        id: "ing-1",
        type: IngredientType.RAW,
      });
      prisma.ingredientPrice.create.mockResolvedValue({});

      await service.addPrice("ing-1", { price: 30, quantity: 5000 }, "co1");

      expect(prisma.ingredientPrice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ingredientId: "ing-1",
            price: expect.anything(),
            quantity: expect.anything(),
          }),
        }),
      );
    });
  });

  describe("createSemiFinished", () => {
    it("throws BadRequestException when an ingredient does not belong to the company", async () => {
      prisma.ingredient.findMany.mockResolvedValue([]); // 0 found, 1 expected

      await expect(
        service.createSemiFinished(
          {
            name: "Massa",
            yield: 1000,
            yieldUnit: IngredientUnit.GRAM,
            items: [{ ingredientId: "x", quantity: 500, unit: IngredientUnit.GRAM }],
          },
          "co1",
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("creates recipe (COMPOSITION) + ingredient (SEMI_FINISHED) in a transaction", async () => {
      prisma.ingredient.findMany.mockResolvedValue([{ id: "ing-flour" }]);
      const createdSemi = {
        id: "semi-1",
        name: "Massa",
        unit: IngredientUnit.GRAM,
        type: IngredientType.SEMI_FINISHED,
        compositionRecipeId: "rec-1",
        deletedAt: null,
        createdAt: new Date(),
      };
      prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb({
          recipe: { create: jest.fn().mockResolvedValue({ id: "rec-1" }) },
          recipeItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
          ingredient: { create: jest.fn().mockResolvedValue(createdSemi) },
        }),
      );
      prisma.ingredient.findFirst.mockResolvedValue({
        ...createdSemi,
        prices: [],
        compositionRecipe: { yield: 1000, yieldUnit: IngredientUnit.GRAM },
      });

      const result = await service.createSemiFinished(
        {
          name: "Massa",
          yield: 1000,
          yieldUnit: IngredientUnit.GRAM,
          items: [{ ingredientId: "ing-flour", quantity: 500, unit: IngredientUnit.GRAM }],
        },
        "co1",
      );

      expect(result.type).toBe(IngredientType.SEMI_FINISHED);
      expect(result.compositionRecipeId).toBe("rec-1");
    });
  });
});
```

- [ ] **Step 2: Executar testes para verificar que falham**

```powershell
npm run test -w @vivi-gourmet/api -- --testPathPattern="ingredients.service"
```

Saída esperada: erro de módulo não encontrado.

- [ ] **Step 3: Implementar IngredientsService**

Criar `apps/api/src/ingredients/ingredients.service.ts`:

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IngredientType, RecipeType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import type { AddPriceDto } from "./dto/add-price.dto";
import type { CreateSemiFinishedDto } from "./dto/create-semi-finished.dto";

export type IngredientRow = {
  id: string;
  companyId: string;
  name: string;
  unit: string;
  type: IngredientType;
  compositionRecipeId: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  latestPricePerUnit: number | null;
  compositionYield: number | null;
  compositionYieldUnit: string | null;
};

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, type?: IngredientType): Promise<IngredientRow[]> {
    const rows = await this.prisma.ingredient.findMany({
      where: { companyId, deletedAt: null, ...(type ? { type } : {}) },
      include: {
        prices: { orderBy: { createdAt: "desc" }, take: 1 },
        compositionRecipe: { select: { yield: true, yieldUnit: true } },
      },
      orderBy: { name: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      unit: r.unit,
      type: r.type,
      compositionRecipeId: r.compositionRecipeId,
      deletedAt: r.deletedAt,
      createdAt: r.createdAt,
      latestPricePerUnit: r.prices[0] ? Number(r.prices[0].pricePerUnit) : null,
      compositionYield: r.compositionRecipe ? Number(r.compositionRecipe.yield) : null,
      compositionYieldUnit: r.compositionRecipe?.yieldUnit ?? null,
    }));
  }

  async createRawMaterial(dto: CreateRawMaterialDto, companyId: string): Promise<IngredientRow> {
    const pricePerUnit = new Prisma.Decimal(dto.price / dto.quantity);

    const created = await this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.create({
        data: { companyId, name: dto.name, unit: dto.unit, type: IngredientType.RAW },
      });
      await tx.ingredientPrice.create({
        data: {
          companyId,
          ingredientId: ingredient.id,
          price: new Prisma.Decimal(dto.price),
          quantity: new Prisma.Decimal(dto.quantity),
          pricePerUnit,
        },
      });
      return ingredient;
    });

    return this.findOne(created.id, companyId);
  }

  async addPrice(ingredientId: string, dto: AddPriceDto, companyId: string): Promise<void> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, companyId, type: IngredientType.RAW, deletedAt: null },
    });
    if (!ingredient) {
      throw new NotFoundException(`Raw material not found: ${ingredientId}`);
    }
    const pricePerUnit = new Prisma.Decimal(dto.price / dto.quantity);
    await this.prisma.ingredientPrice.create({
      data: {
        companyId,
        ingredientId,
        price: new Prisma.Decimal(dto.price),
        quantity: new Prisma.Decimal(dto.quantity),
        pricePerUnit,
      },
    });
  }

  async createSemiFinished(dto: CreateSemiFinishedDto, companyId: string): Promise<IngredientRow> {
    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const found = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, companyId, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== ingredientIds.length) {
      throw new BadRequestException(
        "One or more ingredients not found in this company",
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          companyId,
          name: dto.name,
          type: RecipeType.COMPOSITION,
          yield: new Prisma.Decimal(dto.yield),
          yieldUnit: dto.yieldUnit,
        },
      });
      await tx.recipeItem.createMany({
        data: dto.items.map((item) => ({
          companyId,
          recipeId: recipe.id,
          ingredientId: item.ingredientId,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
        })),
      });
      const ingredient = await tx.ingredient.create({
        data: {
          companyId,
          name: dto.name,
          unit: dto.yieldUnit,
          type: IngredientType.SEMI_FINISHED,
          compositionRecipeId: recipe.id,
        },
      });
      return ingredient;
    });

    return this.findOne(created.id, companyId);
  }

  async findOne(id: string, companyId: string): Promise<IngredientRow> {
    const r = await this.prisma.ingredient.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        prices: { orderBy: { createdAt: "desc" }, take: 1 },
        compositionRecipe: { select: { yield: true, yieldUnit: true } },
      },
    });
    if (!r) throw new NotFoundException(`Ingredient not found: ${id}`);
    return {
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      unit: r.unit,
      type: r.type,
      compositionRecipeId: r.compositionRecipeId,
      deletedAt: r.deletedAt,
      createdAt: r.createdAt,
      latestPricePerUnit: r.prices[0] ? Number(r.prices[0].pricePerUnit) : null,
      compositionYield: r.compositionRecipe ? Number(r.compositionRecipe.yield) : null,
      compositionYieldUnit: r.compositionRecipe?.yieldUnit ?? null,
    };
  }
}
```

- [ ] **Step 4: Executar testes e garantir que passam**

```powershell
npm run test -w @vivi-gourmet/api -- --testPathPattern="ingredients.service"
```

Saída esperada: todos passam.

---

## Task 7: IngredientsModule — Controller, Module e Registro no AppModule

**Files:**
- Create: `apps/api/src/ingredients/ingredients.controller.ts`
- Create: `apps/api/src/ingredients/ingredients.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Criar o controller**

Criar `apps/api/src/ingredients/ingredients.controller.ts`:

```typescript
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { IngredientType } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CostCalculatorService } from "../cost-calculator/cost-calculator.service";
import { IngredientsService } from "./ingredients.service";
import { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import { AddPriceDto } from "./dto/add-price.dto";
import { CreateSemiFinishedDto } from "./dto/create-semi-finished.dto";

@Controller("ingredients")
@UseGuards(JwtAuthGuard)
export class IngredientsController {
  constructor(
    private readonly ingredientsService: IngredientsService,
    private readonly costCalculatorService: CostCalculatorService,
  ) {}

  @Get()
  findAll(
    @CurrentUser("companyId") companyId: string,
    @Query("type") type?: IngredientType,
  ) {
    return this.ingredientsService.findAll(companyId, type);
  }

  @Post("raw")
  createRaw(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateRawMaterialDto,
  ) {
    return this.ingredientsService.createRawMaterial(dto, companyId);
  }

  @Post(":id/prices")
  addPrice(
    @CurrentUser("companyId") companyId: string,
    @Param("id") ingredientId: string,
    @Body() dto: AddPriceDto,
  ) {
    return this.ingredientsService.addPrice(ingredientId, dto, companyId);
  }

  @Post("semi-finished")
  createSemiFinished(
    @CurrentUser("companyId") companyId: string,
    @Body() dto: CreateSemiFinishedDto,
  ) {
    return this.ingredientsService.createSemiFinished(dto, companyId);
  }

  @Get(":id/cost")
  getCost(
    @CurrentUser("companyId") companyId: string,
    @Param("id") ingredientId: string,
  ) {
    return this.costCalculatorService.calculateIngredientCost(ingredientId, companyId);
  }
}
```

- [ ] **Step 2: Criar o module**

Criar `apps/api/src/ingredients/ingredients.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CostCalculatorModule } from "../cost-calculator/cost-calculator.module";
import { IngredientsController } from "./ingredients.controller";
import { IngredientsService } from "./ingredients.service";

@Module({
  imports: [PrismaModule, AuthModule, CostCalculatorModule],
  controllers: [IngredientsController],
  providers: [IngredientsService],
  exports: [IngredientsService],
})
export class IngredientsModule {}
```

- [ ] **Step 3: Registrar IngredientsModule no AppModule**

Modificar `apps/api/src/app.module.ts` adicionando o import:

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { CostCalculatorModule } from "./cost-calculator/cost-calculator.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CostCalculatorModule,
    IngredientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 4: Verificar compilação do TypeScript**

```powershell
npx tsc --noEmit --project "apps\api\tsconfig.json"
```

Saída esperada: sem erros.

- [ ] **Step 5: Rodar todos os testes da API**

```powershell
npm run test -w @vivi-gourmet/api
```

Saída esperada: todos passam.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/ingredients/ apps/api/src/app.module.ts
git commit -m "feat(api): add IngredientsModule with RAW/SEMI_FINISHED CRUD endpoints"
```

---

## Task 8: Frontend — Atualizar Tipos e Hooks de API

**Files:**
- Modify: `apps/web/types/ingredients.ts`
- Create: `apps/web/hooks/useIngredients.ts`

- [ ] **Step 1: Atualizar tipos do frontend para alinhar ao backend**

Substituir `apps/web/types/ingredients.ts` inteiro:

```typescript
/** Alinhado ao enum Prisma `IngredientUnit`. */
export type IngredientUnit = "GRAM" | "ML" | "UNIT";

/** Alinhado ao enum Prisma `IngredientType`. */
export type IngredientType = "RAW" | "SEMI_FINISHED";

export type IngredientFilter = "all" | "RAW" | "SEMI_FINISHED";

/** Resposta da API — shape retornado por GET /ingredients e POST /ingredients/raw|semi-finished. */
export interface IngredientRow {
  id: string;
  companyId: string;
  name: string;
  unit: IngredientUnit;
  type: IngredientType;
  compositionRecipeId: string | null;
  deletedAt: string | null;
  createdAt: string;
  latestPricePerUnit: number | null;
  compositionYield: number | null;
  compositionYieldUnit: IngredientUnit | null;
}

/** Item para exibição na tabela (derivado de IngredientRow). */
export interface IngredientListItem {
  id: string;
  name: string;
  type: IngredientType;
  unit: IngredientUnit;
  unitLabel: string;
  unitCost: number | null;
  createdAt: string;
}

export interface CompositionLineDraft {
  id: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: IngredientUnit;
  lineCost: number;
}

export interface CreateRawMaterialPayload {
  name: string;
  unit: IngredientUnit;
  price: number;
  quantity: number;
}

export interface CreateSemiFinishedPayload {
  name: string;
  yield: number;
  yieldUnit: IngredientUnit;
  items: Array<{ ingredientId: string; quantity: number; unit: IngredientUnit }>;
}
```

- [ ] **Step 2: Criar hooks React Query**

Criar `apps/web/hooks/useIngredients.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  CreateRawMaterialPayload,
  CreateSemiFinishedPayload,
  IngredientFilter,
  IngredientRow,
} from "@/types/ingredients";

const QUERY_KEY = "ingredients";

function buildQueryParams(filter: IngredientFilter) {
  if (filter === "all") return "";
  return `?type=${filter}`;
}

export function useIngredients(filter: IngredientFilter = "all") {
  return useQuery({
    queryKey: [QUERY_KEY, filter],
    queryFn: async () => {
      const { data } = await apiClient.get<IngredientRow[]>(
        `/ingredients${buildQueryParams(filter)}`,
      );
      return data;
    },
  });
}

export function useCreateRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRawMaterialPayload) => {
      const { data } = await apiClient.post<IngredientRow>("/ingredients/raw", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useCreateSemiFinished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSemiFinishedPayload) => {
      const { data } = await apiClient.post<IngredientRow>(
        "/ingredients/semi-finished",
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useAddPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ingredientId,
      price,
      quantity,
    }: {
      ingredientId: string;
      price: number;
      quantity: number;
    }) => {
      await apiClient.post(`/ingredients/${ingredientId}/prices`, { price, quantity });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
```

---

## Task 9: Frontend — Atualizar Página de Ingredientes

**Files:**
- Modify: `apps/web/app/(dashboard)/ingredientes/page.tsx`
- Modify: `apps/web/components/ingredients/IngredientTable.tsx`
- Modify: `apps/web/components/ingredients/IngredientModal.tsx`
- Modify: `apps/web/components/ingredients/IngredientPageHeader.tsx`
- Modify: `apps/web/lib/ingredient-math.ts`
- Modify: `apps/web/lib/navigation.ts`

- [ ] **Step 1: Atualizar IngredientPageHeader para novos tipos de filtro**

Ler `apps/web/components/ingredients/IngredientPageHeader.tsx` e atualizar o tipo do `filter` prop e os valores dos botões de filtro de `"basic"/"compound"` para `"RAW"/"SEMI_FINISHED"`.

Buscar a linha que usa `filter === "basic"` e substituir por `filter === "RAW"`, e `filter === "compound"` por `filter === "SEMI_FINISHED"`. Atualizar o tipo `IngredientFilter` importado (já foi atualizado no types.ts da Task 8).

- [ ] **Step 2: Atualizar IngredientTable para novo shape**

Em `apps/web/components/ingredients/IngredientTable.tsx`, o componente usa `row.kind`. Substituir todas as referências a `row.kind` por `row.type`, e os valores `"basic"` → `"RAW"` e `"compound"` → `"SEMI_FINISHED"`:

```typescript
// Onde aparece:
<TypeBadge $compound={row.kind === "compound"}>
  {row.kind === "basic" ? "Básico" : "Composto"}
</TypeBadge>

// Substituir por:
<TypeBadge $compound={row.type === "SEMI_FINISHED"}>
  {row.type === "RAW" ? "Matéria-prima" : "Semiacabado"}
</TypeBadge>
```

Atualizar o tipo da prop `items` de `IngredientListItem[]` (mantém o mesmo nome, mas o shape mudou).

Atualizar `SortKey` para remover `"kind"` e adicionar `"type"`:
```typescript
type SortKey = "name" | "type" | "unit" | "unitCost" | "createdAt";
```

Atualizar o default do estado de sort de `{ key: "name", dir: "asc" }` e a lógica de ordenação: onde lia `a.lastUpdated` usar `a.createdAt`; onde lia `a.kind` usar `a.type`; onde lia `a.unitCost` — notar que agora é `number | null`, fazer `(a.unitCost ?? 0) - (b.unitCost ?? 0)`.

Atualizar o Th do cabeçalho de "Última atualização" para "Criado em", e a coluna de custo para exibir `—` quando `unitCost === null`.

- [ ] **Step 3: Atualizar IngredientModal para novos payloads**

Em `apps/web/components/ingredients/IngredientModal.tsx`, atualizar o tipo de `onSubmit`:

```typescript
// Remover import de CreateIngredientSubmitPayload
// Adicionar imports de:
import type {
  CreateRawMaterialPayload,
  CreateSemiFinishedPayload,
  CompositionLineDraft,
  IngredientListItem,
} from "@/types/ingredients";

type IngredientModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmitRaw: (payload: CreateRawMaterialPayload) => void;
  onSubmitSemiFinished: (payload: CreateSemiFinishedPayload) => void;
  rawIngredients: IngredientListItem[]; // para o seletor de composição
};
```

Atualizar `handleCreate` para chamar `onSubmitRaw` ou `onSubmitSemiFinished`:

```typescript
const handleCreate = () => {
  if (step === "basic" && validateBasic() && basicUnitCost != null) {
    onSubmitRaw({
      name: basicForm.name.trim(),
      unit: basicForm.unit,
      price: basicPrice,
      quantity: basicQty,
    });
    onClose();
    return;
  }
  if (step === "compound" && validateCompound()) {
    onSubmitSemiFinished({
      name: compoundMeta.name.trim(),
      yield: yieldNum,
      yieldUnit: compoundMeta.yieldUnit,
      items: compositionLines
        .filter((l) => l.ingredientId && l.lineCost > 0)
        .map(({ ingredientId, quantity, unit }) => ({ ingredientId, quantity, unit })),
    });
    onClose();
  }
};
```

- [ ] **Step 4: Atualizar ingredient-math.ts — remover dependência de IngredientKind**

Em `apps/web/lib/ingredient-math.ts`, a função `computeCompositionLineCost` referencia `IngredientListItem` com campo `referenceUnit` que não existe mais. Atualizar para usar o novo shape:

```typescript
// Remover a função computeCompositionLineCost (não é mais usada)
// A lógica de custo de linha agora é feita com os dados brutos
```

- [ ] **Step 5: Substituir page.tsx por versão conectada à API**

Substituir `apps/web/app/(dashboard)/ingredientes/page.tsx` inteiro:

```typescript
"use client";

import { useMemo, useState } from "react";
import {
  IngredientModal,
  IngredientPageHeader,
  IngredientTable,
} from "@/components/ingredients";
import {
  useIngredients,
  useCreateRawMaterial,
  useCreateSemiFinished,
} from "@/hooks/useIngredients";
import { unitToLabel } from "@/lib/ingredient-math";
import type {
  IngredientFilter,
  IngredientListItem,
} from "@/types/ingredients";

export default function IngredientesPage() {
  const [filter, setFilter] = useState<IngredientFilter>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: rows = [], isLoading } = useIngredients(filter);
  const createRaw = useCreateRawMaterial();
  const createSemi = useCreateSemiFinished();

  const rawIngredients = useMemo<IngredientListItem[]>(
    () =>
      rows
        .filter((r) => r.type === "RAW")
        .map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          unit: r.unit,
          unitLabel: unitToLabel(r.unit),
          unitCost: r.latestPricePerUnit,
          createdAt: r.createdAt,
        })),
    [rows],
  );

  const tableItems = useMemo<IngredientListItem[]>(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        unit: r.unit,
        unitLabel: unitToLabel(r.unit),
        unitCost: r.latestPricePerUnit,
        createdAt: r.createdAt,
      }));
  }, [rows, search]);

  return (
    <>
      <IngredientPageHeader
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onNewIngredient={() => setModalOpen(true)}
      />
      {isLoading ? (
        <p style={{ padding: "2rem", color: "#71717a" }}>Carregando ingredientes…</p>
      ) : (
        <IngredientTable items={tableItems} />
      )}
      <IngredientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitRaw={(payload) => {
          createRaw.mutate(payload, { onSuccess: () => setModalOpen(false) });
        }}
        onSubmitSemiFinished={(payload) => {
          createSemi.mutate(payload, { onSuccess: () => setModalOpen(false) });
        }}
        rawIngredients={rawIngredients}
      />
    </>
  );
}
```

- [ ] **Step 6: Atualizar navigation.ts — adicionar ícones de matéria-prima e semiacabado se necessário**

O nav atual já tem `/ingredientes`. Não é necessária alteração — ambos RAW e SEMI_FINISHED vivem na mesma página com filtro.

- [ ] **Step 7: Verificar compilação do TypeScript no frontend**

```powershell
npx tsc --noEmit --project "apps\web\tsconfig.json"
```

Saída esperada: sem erros.

- [ ] **Step 8: Commit**

```bash
git add apps/web/types/ingredients.ts \
        apps/web/hooks/useIngredients.ts \
        apps/web/app/\(dashboard\)/ingredientes/page.tsx \
        apps/web/components/ingredients/ \
        apps/web/lib/ingredient-math.ts
git commit -m "feat(web): wire ingredients page to API, replace mocks with React Query"
```

---

## Task 10: Smoke Test End-to-End

- [ ] **Step 1: Subir a stack completa**

```powershell
docker compose up -d
npm run dev
```

Aguardar todos os serviços iniciarem (saída do Turborepo mostra `ready` para web e `Application is running` para api).

- [ ] **Step 2: Registrar usuário e obter token**

```powershell
$body = '{"email":"test@vivi.local","password":"password12","name":"Teste","companyName":"Padaria Teste"}'
$res = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/auth/register" `
  -ContentType "application/json" -Body $body
$token = $res.accessToken
```

- [ ] **Step 3: Criar uma matéria-prima**

```powershell
$headers = @{ Authorization = "Bearer $token" }
$rawBody = '{"name":"Farinha de Trigo","unit":"GRAM","price":25,"quantity":5000}'
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/ingredients/raw" `
  -ContentType "application/json" -Headers $headers -Body $rawBody
```

Saída esperada: objeto com `type: "RAW"`, `latestPricePerUnit: 0.005`.

- [ ] **Step 4: Criar um semiacabado usando a matéria-prima**

Copiar o `id` da farinha retornada no step anterior e substituir em `<FLOUR_ID>`:

```powershell
$semiBody = '{"name":"Massa de Pizza","yield":1000,"yieldUnit":"GRAM","items":[{"ingredientId":"<FLOUR_ID>","quantity":500,"unit":"GRAM"}]}'
$semi = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/ingredients/semi-finished" `
  -ContentType "application/json" -Headers $headers -Body $semiBody
```

Saída esperada: objeto com `type: "SEMI_FINISHED"`, `compositionRecipeId` preenchido.

- [ ] **Step 5: Calcular custo do semiacabado**

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3001/ingredients/$($semi.id)/cost" `
  -Headers $headers
```

Saída esperada: `costPerUnit` ≈ `0.003` (500 × 0.005 / 1000 = 0.0025 com a farinha, ajustar conforme preço definido).

- [ ] **Step 6: Verificar a página web**

Abrir http://localhost:3000/ingredientes. A página deve listar os ingredientes criados via API, com badges "Matéria-prima" e "Semiacabado". O modal de criação deve salvar na API (verificar que ao fechar e reabrir a página os dados persistem).

---

## Self-Review

**Spec coverage:**
- ✅ Matéria-prima com preço de compra, quantidade, unidade, custo por unidade calculado → Task 1 (schema) + Task 5/6 (createRawMaterial)
- ✅ Ingredientes compostos/semiacabados com receita interna → Task 1 (schema) + Task 5/6 (createSemiFinished)
- ✅ Custo calculado automaticamente somando componentes → Task 4 (CostCalculatorService)
- ✅ Múltiplos níveis de composição (recursão) → Task 4 (computeIngredientInternal recursivo)
- ✅ Detecção de ciclo → Task 4 (Set visited)
- ✅ IngredientPrice append-only mantida → Task 6 (addPrice cria nova linha)
- ✅ Frontend conectado à API → Tasks 8-9
- ✅ Endpoints REST autenticados por JWT → Task 7 (JwtAuthGuard)
- ✅ companyId isolado por tenant (vem do JWT, nunca do body) → Task 7 (controller usa @CurrentUser)

**Placeholder scan:** Nenhum TBD/TODO encontrado.

**Type consistency:**
- `IngredientRow.type: IngredientType` → usado como `IngredientType.RAW` e `IngredientType.SEMI_FINISHED` consistentemente
- `CostBreakdownItem.type: "raw" | "semi_finished"` (string literal, não o enum Prisma)
- `IngredientListItem.unitCost: number | null` → tratado com `?? 0` na ordenação e `—` na exibição

---
