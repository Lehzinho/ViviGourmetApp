# Ingredient Edit & Delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PATCH and DELETE endpoints to the NestJS API and wire up an EditIngredientModal + DeleteConfirmDialog in the Next.js frontend so users can rename RAW ingredients or fully update SEMI_FINISHED composition, and soft-delete ingredients that aren't in use.

**Architecture:** The API adds three routes (`GET /ingredients/:id`, `PATCH /ingredients/:id`, `DELETE /ingredients/:id`). The frontend fetches ingredient detail (with composition items) when the edit modal opens for SEMI_FINISHED, and uses React Query mutations that invalidate the `["ingredients"]` query cache on success. A 409 Conflict from DELETE carries `usedIn: string[]` and surfaces as an in-dialog error list.

**Tech Stack:** NestJS 10, Prisma, class-validator/class-transformer; Next.js 14 App Router, Styled Components, @tanstack/react-query v5, axios.

---

## File Map

**Create:**
- `apps/api/src/ingredients/dto/update-ingredient.dto.ts` — unified DTO for PATCH (name always required; yield/yieldUnit/items optional for SEMI_FINISHED)
- `apps/web/components/ingredients/EditIngredientModal.tsx` — modal for editing RAW or SEMI_FINISHED
- `apps/web/components/ingredients/DeleteConfirmDialog.tsx` — confirm dialog with conflict-list error state

**Modify:**
- `apps/api/src/ingredients/ingredients.service.ts` — add `findDetail`, `update`, `remove`
- `apps/api/src/ingredients/ingredients.service.spec.ts` — add tests for new methods + update prisma mock
- `apps/api/src/ingredients/ingredients.controller.ts` — add GET /:id, PATCH /:id, DELETE /:id
- `apps/web/types/ingredients.ts` — add `CompositionItemDetail`, `IngredientDetailRow`, `UpdateRawMaterialPayload`, `UpdateSemiFinishedPayload`
- `apps/web/hooks/useIngredients.ts` — add `useIngredientDetail`, `useUpdateIngredient`, `useDeleteIngredient`
- `apps/web/components/ingredients/IngredientTable.tsx` — add `onDelete` prop + "Excluir" button
- `apps/web/components/ingredients/index.ts` — export new components
- `apps/web/app/(dashboard)/ingredientes/page.tsx` — add edit/delete state and handlers

---

## Task 1: API — DTO + Service methods + Tests

**Files:**
- Create: `apps/api/src/ingredients/dto/update-ingredient.dto.ts`
- Modify: `apps/api/src/ingredients/ingredients.service.ts`
- Modify: `apps/api/src/ingredients/ingredients.service.spec.ts`

- [ ] **Step 1: Create `update-ingredient.dto.ts`**

```ts
// apps/api/src/ingredients/dto/update-ingredient.dto.ts
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { IngredientUnit } from "@prisma/client";

class UpdateCompositionItemDto {
  @IsString()
  ingredientId!: string;

  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;
}

export class UpdateIngredientDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  yield?: number;

  @IsOptional()
  @IsEnum(IngredientUnit)
  yieldUnit?: IngredientUnit;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateCompositionItemDto)
  items?: UpdateCompositionItemDto[];
}
```

- [ ] **Step 2: Add `IngredientDetailRow` export type to `ingredients.service.ts`**

In `apps/api/src/ingredients/ingredients.service.ts`, add this type after `IngredientRow`:

```ts
export type IngredientDetailRow = IngredientRow & {
  compositionItems: Array<{ ingredientId: string; quantity: number; unit: string }> | null;
};
```

- [ ] **Step 3: Add `findDetail` method to `IngredientsService`**

Add this method to `IngredientsService` (after `findOne`):

```ts
async findDetail(id: string, companyId: string): Promise<IngredientDetailRow> {
  const r = await this.prisma.ingredient.findFirst({
    where: { id, companyId, deletedAt: null },
    include: {
      prices: { orderBy: { createdAt: "desc" }, take: 1 },
      compositionRecipe: {
        select: {
          yield: true,
          yieldUnit: true,
          items: { select: { ingredientId: true, quantity: true, unit: true } },
        },
      },
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
    compositionItems: r.compositionRecipe
      ? r.compositionRecipe.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: Number(item.quantity),
          unit: item.unit,
        }))
      : null,
  };
}
```

- [ ] **Step 4: Add `update` method to `IngredientsService`**

Add the following imports at the top of `ingredients.service.ts` (add `HttpException`, `HttpStatus` to existing NestJS imports):

```ts
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
```

Also add the import for `UpdateIngredientDto`:

```ts
import type { UpdateIngredientDto } from "./dto/update-ingredient.dto";
```

Then add the `update` method to `IngredientsService`:

```ts
async update(id: string, dto: UpdateIngredientDto, companyId: string): Promise<IngredientRow> {
  const ingredient = await this.prisma.ingredient.findFirst({
    where: { id, companyId, deletedAt: null },
  });
  if (!ingredient) throw new NotFoundException(`Ingredient not found: ${id}`);

  if (ingredient.type === IngredientType.RAW) {
    await this.prisma.ingredient.update({ where: { id }, data: { name: dto.name } });
  } else {
    if (dto.yield == null || !dto.yieldUnit || !dto.items) {
      throw new BadRequestException(
        "yield, yieldUnit, and items are required for SEMI_FINISHED update",
      );
    }
    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const found = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, companyId, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== ingredientIds.length) {
      throw new BadRequestException("One or more ingredients not found in this company");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.ingredient.update({ where: { id }, data: { name: dto.name } });
      await tx.recipe.update({
        where: { id: ingredient.compositionRecipeId! },
        data: {
          name: dto.name,
          yield: new Prisma.Decimal(dto.yield!),
          yieldUnit: dto.yieldUnit!,
        },
      });
      await tx.recipeItem.deleteMany({ where: { recipeId: ingredient.compositionRecipeId! } });
      await tx.recipeItem.createMany({
        data: dto.items!.map((item) => ({
          companyId,
          recipeId: ingredient.compositionRecipeId!,
          ingredientId: item.ingredientId,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
        })),
      });
    });
  }

  return this.findOne(id, companyId);
}
```

- [ ] **Step 5: Add `remove` method to `IngredientsService`**

```ts
async remove(id: string, companyId: string): Promise<void> {
  const ingredient = await this.prisma.ingredient.findFirst({
    where: { id, companyId, deletedAt: null },
  });
  if (!ingredient) throw new NotFoundException(`Ingredient not found: ${id}`);

  const usages = await this.prisma.recipeItem.findMany({
    where: { ingredientId: id },
    include: { recipe: { select: { name: true } } },
  });

  if (usages.length > 0) {
    const recipeNames = [...new Set(usages.map((u) => u.recipe.name))];
    throw new HttpException(
      { statusCode: 409, message: "Ingrediente em uso", usedIn: recipeNames },
      HttpStatus.CONFLICT,
    );
  }

  await this.prisma.ingredient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

- [ ] **Step 6: Update prisma mock in `ingredients.service.spec.ts`**

Replace the `prisma` mock declaration with the expanded version that includes the new methods:

```ts
let prisma: {
  ingredient: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  ingredientPrice: { create: jest.Mock; findMany: jest.Mock };
  recipe: { create: jest.Mock; update: jest.Mock };
  recipeItem: { createMany: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
  $transaction: jest.Mock;
};
```

And in `beforeEach`:

```ts
prisma = {
  ingredient: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  ingredientPrice: { create: jest.fn(), findMany: jest.fn() },
  recipe: { create: jest.fn(), update: jest.fn() },
  recipeItem: { createMany: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
};
```

- [ ] **Step 7: Write failing tests for `update` and `remove`**

Add these describe blocks to `ingredients.service.spec.ts`:

```ts
describe("update", () => {
  it("updates only the name for a RAW ingredient", async () => {
    const rawIngredient = {
      id: "ing-1",
      companyId: "co1",
      type: IngredientType.RAW,
      compositionRecipeId: null,
      deletedAt: null,
    };
    prisma.ingredient.findFirst
      .mockResolvedValueOnce(rawIngredient)
      .mockResolvedValueOnce({
        ...rawIngredient,
        name: "Farinha Integral",
        unit: IngredientUnit.GRAM,
        createdAt: new Date(),
        prices: [{ pricePerUnit: "0.005", createdAt: new Date() }],
        compositionRecipe: null,
      });
    prisma.ingredient.update.mockResolvedValue({});

    const result = await service.update("ing-1", { name: "Farinha Integral" }, "co1");

    expect(prisma.ingredient.update).toHaveBeenCalledWith({
      where: { id: "ing-1" },
      data: { name: "Farinha Integral" },
    });
    expect(result.name).toBe("Farinha Integral");
  });

  it("throws BadRequestException when SEMI_FINISHED update omits yield", async () => {
    prisma.ingredient.findFirst.mockResolvedValue({
      id: "semi-1",
      companyId: "co1",
      type: IngredientType.SEMI_FINISHED,
      compositionRecipeId: "rec-1",
      deletedAt: null,
    });

    await expect(
      service.update("semi-1", { name: "Massa" }, "co1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("replaces composition items in a transaction for SEMI_FINISHED", async () => {
    const semiIngredient = {
      id: "semi-1",
      companyId: "co1",
      type: IngredientType.SEMI_FINISHED,
      compositionRecipeId: "rec-1",
      deletedAt: null,
    };
    prisma.ingredient.findMany.mockResolvedValue([{ id: "ing-flour" }]);
    prisma.ingredient.findFirst
      .mockResolvedValueOnce(semiIngredient)
      .mockResolvedValueOnce({
        ...semiIngredient,
        name: "Massa Nova",
        unit: IngredientUnit.GRAM,
        createdAt: new Date(),
        prices: [],
        compositionRecipe: { yield: 500, yieldUnit: IngredientUnit.GRAM },
      });

    const txUpdate = jest.fn().mockResolvedValue({});
    const txRecipeUpdate = jest.fn().mockResolvedValue({});
    const txDeleteMany = jest.fn().mockResolvedValue({});
    const txCreateMany = jest.fn().mockResolvedValue({});

    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        ingredient: { update: txUpdate },
        recipe: { update: txRecipeUpdate },
        recipeItem: { deleteMany: txDeleteMany, createMany: txCreateMany },
      }),
    );

    await service.update(
      "semi-1",
      {
        name: "Massa Nova",
        yield: 500,
        yieldUnit: IngredientUnit.GRAM,
        items: [{ ingredientId: "ing-flour", quantity: 300, unit: IngredientUnit.GRAM }],
      },
      "co1",
    );

    expect(txDeleteMany).toHaveBeenCalledWith({ where: { recipeId: "rec-1" } });
    expect(txCreateMany).toHaveBeenCalled();
  });
});

describe("remove", () => {
  it("throws NotFoundException when ingredient not found", async () => {
    prisma.ingredient.findFirst.mockResolvedValue(null);
    await expect(service.remove("x", "co1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("throws 409 HttpException when ingredient is referenced by a recipe item", async () => {
    prisma.ingredient.findFirst.mockResolvedValue({ id: "ing-1", deletedAt: null });
    prisma.recipeItem.findMany.mockResolvedValue([
      { recipe: { name: "Pão de mel" } },
    ]);

    await expect(service.remove("ing-1", "co1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("soft-deletes the ingredient when not in use", async () => {
    prisma.ingredient.findFirst.mockResolvedValue({ id: "ing-1", deletedAt: null });
    prisma.recipeItem.findMany.mockResolvedValue([]);
    prisma.ingredient.update.mockResolvedValue({});

    await service.remove("ing-1", "co1");

    expect(prisma.ingredient.update).toHaveBeenCalledWith({
      where: { id: "ing-1" },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });
  });
});
```

- [ ] **Step 8: Run all tests and verify they pass**

```powershell
npm run test -w @vivi-gourmet/api -- --testPathPattern=ingredients.service
```

Expected: All tests in `ingredients.service.spec.ts` pass, including the new `update` and `remove` suites.

- [ ] **Step 10: Commit**

```powershell
git add apps/api/src/ingredients/dto/update-ingredient.dto.ts apps/api/src/ingredients/ingredients.service.ts apps/api/src/ingredients/ingredients.service.spec.ts
git commit -m "feat(api): add update and remove methods to IngredientsService"
```

---

## Task 2: API — Controller routes

**Files:**
- Modify: `apps/api/src/ingredients/ingredients.controller.ts`

- [ ] **Step 1: Add new imports to the controller**

In `apps/api/src/ingredients/ingredients.controller.ts`, replace the import line from `@nestjs/common` with:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
```

Add import for the new DTO below the existing DTO imports:

```ts
import { UpdateIngredientDto } from "./dto/update-ingredient.dto";
```

- [ ] **Step 2: Add the three new routes to `IngredientsController`**

Add these methods inside the class, after the existing `@Get(":id/cost")` route:

```ts
@Get(":id")
findOne(
  @CurrentUser("companyId") companyId: string,
  @Param("id") id: string,
) {
  return this.ingredientsService.findDetail(id, companyId);
}

@Patch(":id")
async update(
  @CurrentUser("companyId") companyId: string,
  @Param("id") id: string,
  @Body() dto: UpdateIngredientDto,
) {
  const result = await this.ingredientsService.update(id, dto, companyId);
  if (result.type === IngredientType.SEMI_FINISHED) {
    this.costCalculatorService.invalidateIngredientCache(id, companyId);
  }
  return result;
}

@Delete(":id")
@HttpCode(HttpStatus.NO_CONTENT)
remove(
  @CurrentUser("companyId") companyId: string,
  @Param("id") id: string,
) {
  return this.ingredientsService.remove(id, companyId);
}
```

> **Note:** `GET /:id` must come after `GET :id/cost` because NestJS resolves static path segments before dynamic ones when declared in the same controller class. However, because `cost` is a literal string and `:id` is dynamic, NestJS actually handles this correctly regardless of order. Still, keeping static routes first is the safer convention.

- [ ] **Step 3: Verify the API compiles**

```powershell
npm run build -w @vivi-gourmet/api
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```powershell
git add apps/api/src/ingredients/ingredients.controller.ts
git commit -m "feat(api): add GET/:id, PATCH/:id, DELETE/:id routes for ingredients"
```

---

## Task 3: Web — Types & Hooks

**Files:**
- Modify: `apps/web/types/ingredients.ts`
- Modify: `apps/web/hooks/useIngredients.ts`

- [ ] **Step 1: Add new types to `types/ingredients.ts`**

Append these exports at the end of `apps/web/types/ingredients.ts`:

```ts
export interface CompositionItemDetail {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface IngredientDetailRow extends IngredientRow {
  compositionItems: CompositionItemDetail[] | null;
}

export interface UpdateRawMaterialPayload {
  name: string;
}

export interface UpdateSemiFinishedPayload {
  name: string;
  yield: number;
  yieldUnit: IngredientUnit;
  items: Array<{ ingredientId: string; quantity: number; unit: IngredientUnit }>;
}
```

- [ ] **Step 2: Add new hook imports to `hooks/useIngredients.ts`**

Add the new type imports at the top of the import block:

```ts
import type {
  CreateRawMaterialPayload,
  CreateSemiFinishedPayload,
  IngredientDetailRow,
  IngredientFilter,
  IngredientRow,
  UpdateRawMaterialPayload,
  UpdateSemiFinishedPayload,
} from "@/types/ingredients";
```

- [ ] **Step 3: Add `useIngredientDetail` hook**

Append to `apps/web/hooks/useIngredients.ts`:

```ts
export function useIngredientDetail(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, id, "detail"],
    queryFn: async () => {
      const { data } = await apiClient.get<IngredientDetailRow>(`/ingredients/${id}`);
      return data;
    },
    enabled: id !== null,
  });
}
```

- [ ] **Step 4: Add `useUpdateIngredient` hook**

Append to `apps/web/hooks/useIngredients.ts`:

```ts
export function useUpdateIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateRawMaterialPayload | UpdateSemiFinishedPayload;
    }) => {
      const { data } = await apiClient.patch<IngredientRow>(`/ingredients/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
```

- [ ] **Step 5: Add `useDeleteIngredient` hook**

Append to `apps/web/hooks/useIngredients.ts`:

```ts
export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/ingredients/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```powershell
npm run build -w @vivi-gourmet/web 2>&1 | Select-String "error"
```

Expected: No TypeScript errors in the output.

- [ ] **Step 7: Commit**

```powershell
git add apps/web/types/ingredients.ts apps/web/hooks/useIngredients.ts
git commit -m "feat(web): add UpdatePayload types and useIngredientDetail/Update/Delete hooks"
```

---

## Task 4: Web — EditIngredientModal

**Files:**
- Create: `apps/web/components/ingredients/EditIngredientModal.tsx`
- Modify: `apps/web/components/ingredients/index.ts`

- [ ] **Step 1: Create `EditIngredientModal.tsx`**

```tsx
// apps/web/components/ingredients/EditIngredientModal.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import type {
  CompositionLineDraft,
  IngredientListItem,
  IngredientRow,
  IngredientUnit,
} from "@/types/ingredients";
import { useIngredientDetail, useUpdateIngredient } from "@/hooks/useIngredients";
import { parseDecimalInput, newDraftId, unitToLabel } from "@/lib/ingredient-math";
import { Field, Input, Label } from "./form-primitives";
import { IngredientFormCompound } from "./IngredientFormCompound";
import type { CompoundFormMeta } from "./IngredientFormCompound";
import { CostSummaryCard } from "./CostSummaryCard";

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  overflow-y: auto;
`;

const Panel = styled.div`
  width: min(1080px, 100%);
  max-height: min(92vh, 900px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
`;

const ModalHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CloseBtn = styled.button`
  border: none;
  background: ${({ theme }) => theme.colors.surface};
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 1.1rem;
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[200]};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
`;

const Layout = styled.div`
  display: grid;
  gap: 1.25rem;
  align-items: start;

  @media (min-width: 920px) {
    grid-template-columns: 1fr 260px;
  }
`;

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  justify-content: flex-end;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const Btn = styled.button<{ $variant?: "ghost" | "primary" }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;

  ${({ theme, $variant }) =>
    $variant === "primary"
      ? `
    background: ${theme.colors.primary};
    color: ${theme.colors.text.inverse};
    &:hover:not(:disabled) { background: ${theme.colors.primaryHover}; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  `
      : `
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    border: 1px solid ${theme.colors.border};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

type EditIngredientModalProps = {
  open: boolean;
  ingredient: IngredientRow | null;
  onClose: () => void;
  rawIngredients: IngredientListItem[];
};

export function EditIngredientModal({
  open,
  ingredient,
  onClose,
  rawIngredients,
}: EditIngredientModalProps) {
  const updateIngredient = useUpdateIngredient();

  // RAW form state
  const [rawName, setRawName] = useState("");

  // SEMI_FINISHED form state
  const [compoundMeta, setCompoundMeta] = useState<CompoundFormMeta>({
    name: "",
    category: "",
    yield: "",
    yieldUnit: "GRAM",
  });
  const [lines, setLines] = useState<CompositionLineDraft[]>([]);

  const detailQuery = useIngredientDetail(
    open && ingredient?.type === "SEMI_FINISHED" ? ingredient.id : null,
  );

  // Reset basic fields when ingredient changes
  useEffect(() => {
    if (!ingredient) return;
    if (ingredient.type === "RAW") {
      setRawName(ingredient.name);
    } else {
      setCompoundMeta({
        name: ingredient.name,
        category: "",
        yield: String(ingredient.compositionYield ?? ""),
        yieldUnit: (ingredient.compositionYieldUnit ?? "GRAM") as IngredientUnit,
      });
      setLines([]);
    }
  }, [ingredient]);

  // Populate composition lines when detail data arrives
  useEffect(() => {
    if (!detailQuery.data?.compositionItems) return;
    setLines(
      detailQuery.data.compositionItems.map((item) => {
        const ing = rawIngredients.find((r) => r.id === item.ingredientId);
        return {
          id: newDraftId(),
          ingredientId: item.ingredientId,
          ingredientName: ing?.name ?? "",
          quantity: item.quantity,
          unit: item.unit as IngredientUnit,
          lineCost: ing?.unitCost ? item.quantity * ing.unitCost : 0,
        };
      }),
    );
  }, [detailQuery.data, rawIngredients]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const yieldNum = parseDecimalInput(compoundMeta.yield);
  const compoundTotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineCost, 0),
    [lines],
  );
  const compoundUnitCost =
    yieldNum > 0 && compoundTotal > 0 ? compoundTotal / yieldNum : null;

  const isRawValid = rawName.trim().length > 0;
  const isSemiValid =
    compoundMeta.name.trim().length > 0 &&
    yieldNum > 0 &&
    lines.filter((l) => l.ingredientId && l.quantity > 0).length > 0;

  const handleSubmit = useCallback(() => {
    if (!ingredient) return;
    if (ingredient.type === "RAW") {
      updateIngredient.mutate(
        { id: ingredient.id, payload: { name: rawName.trim() } },
        { onSuccess: onClose },
      );
    } else {
      updateIngredient.mutate(
        {
          id: ingredient.id,
          payload: {
            name: compoundMeta.name.trim(),
            yield: yieldNum,
            yieldUnit: compoundMeta.yieldUnit,
            items: lines
              .filter((l) => l.ingredientId && l.quantity > 0)
              .map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity, unit: l.unit })),
          },
        },
        { onSuccess: onClose },
      );
    }
  }, [ingredient, rawName, compoundMeta, yieldNum, lines, updateIngredient, onClose]);

  if (!open || !ingredient) return null;

  const isSubmitDisabled =
    updateIngredient.isPending ||
    (ingredient.type === "RAW" ? !isRawValid : !isSemiValid);

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-ingredient-modal-title"
      onClick={onClose}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <ModalHead>
          <ModalTitle id="edit-ingredient-modal-title">
            Editar ingrediente
          </ModalTitle>
          <CloseBtn type="button" aria-label="Fechar" onClick={onClose}>
            ×
          </CloseBtn>
        </ModalHead>

        <Body>
          {ingredient.type === "RAW" ? (
            <Field>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={rawName}
                onChange={(e) => setRawName(e.target.value)}
                placeholder="Ex.: Farinha de trigo"
              />
            </Field>
          ) : (
            <Layout>
              <div>
                <IngredientFormCompound
                  meta={compoundMeta}
                  onMetaChange={setCompoundMeta}
                  lines={lines}
                  onLinesChange={setLines}
                  basicOptions={rawIngredients}
                />
              </div>
              <CostSummaryCard
                variant="compound"
                totalCost={compoundTotal}
                yieldAmount={yieldNum}
                yieldUnitLabel={unitToLabel(compoundMeta.yieldUnit)}
                unitCost={compoundUnitCost}
              />
            </Layout>
          )}
        </Body>

        <Footer>
          <Btn type="button" $variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            type="button"
            $variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            {updateIngredient.isPending ? "Salvando…" : "Salvar"}
          </Btn>
        </Footer>
      </Panel>
    </Backdrop>
  );
}
```

- [ ] **Step 2: Export from `index.ts`**

Add this line to `apps/web/components/ingredients/index.ts`:

```ts
export { EditIngredientModal } from "./EditIngredientModal";
```

- [ ] **Step 3: Check for TypeScript errors**

```powershell
npm run build -w @vivi-gourmet/web 2>&1 | Select-String "error"
```

Expected: No TypeScript errors.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/components/ingredients/EditIngredientModal.tsx apps/web/components/ingredients/index.ts
git commit -m "feat(web): add EditIngredientModal component"
```

---

## Task 5: Web — DeleteConfirmDialog

**Files:**
- Create: `apps/web/components/ingredients/DeleteConfirmDialog.tsx`
- Modify: `apps/web/components/ingredients/index.ts`

- [ ] **Step 1: Create `DeleteConfirmDialog.tsx`**

```tsx
// apps/web/components/ingredients/DeleteConfirmDialog.tsx
"use client";

import styled from "styled-components";

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
`;

const Dialog = styled.div`
  width: min(420px, 100%);
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
  padding: 1.5rem;
`;

const Title = styled.h2`
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Body = styled.p`
  margin: 0 0 1.25rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const ConflictList = styled.ul`
  margin: 0.5rem 0 0;
  padding: 0 0 0 1.25rem;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Footer = styled.div`
  display: flex;
  gap: 0.65rem;
  justify-content: flex-end;
`;

const Btn = styled.button<{ $danger?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;

  ${({ theme, $danger }) =>
    $danger
      ? `
    border: none;
    background: #dc2626;
    color: #ffffff;
    &:hover:not(:disabled) { background: #b91c1c; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  `
      : `
    border: 1px solid ${theme.colors.border};
    background: ${theme.colors.background};
    color: ${theme.colors.text.secondary};
    &:hover { border-color: ${theme.colors.neutral[400]}; }
  `}
`;

type DeleteConfirmDialogProps = {
  open: boolean;
  ingredientName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  conflictList?: string[];
};

export function DeleteConfirmDialog({
  open,
  ingredientName,
  onClose,
  onConfirm,
  isLoading,
  conflictList,
}: DeleteConfirmDialogProps) {
  if (!open) return null;

  const hasConflict = conflictList && conflictList.length > 0;

  return (
    <Backdrop
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onClick={onClose}
    >
      <Dialog onClick={(e) => e.stopPropagation()}>
        {hasConflict ? (
          <>
            <Title id="delete-dialog-title">Não é possível excluir</Title>
            <Body>
              <strong>{ingredientName}</strong> está sendo usado nas seguintes
              receitas e não pode ser excluído:
              <ConflictList>
                {conflictList!.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ConflictList>
            </Body>
            <Footer>
              <Btn type="button" onClick={onClose}>
                Fechar
              </Btn>
            </Footer>
          </>
        ) : (
          <>
            <Title id="delete-dialog-title">Excluir ingrediente</Title>
            <Body>
              Deseja excluir <strong>{ingredientName}</strong>? Esta ação não
              pode ser desfeita.
            </Body>
            <Footer>
              <Btn type="button" onClick={onClose}>
                Cancelar
              </Btn>
              <Btn
                type="button"
                $danger
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? "Excluindo…" : "Excluir"}
              </Btn>
            </Footer>
          </>
        )}
      </Dialog>
    </Backdrop>
  );
}
```

- [ ] **Step 2: Export from `index.ts`**

Add this line to `apps/web/components/ingredients/index.ts`:

```ts
export { DeleteConfirmDialog } from "./DeleteConfirmDialog";
```

- [ ] **Step 3: Commit**

```powershell
git add apps/web/components/ingredients/DeleteConfirmDialog.tsx apps/web/components/ingredients/index.ts
git commit -m "feat(web): add DeleteConfirmDialog component"
```

---

## Task 6: Web — IngredientTable + page wiring

**Files:**
- Modify: `apps/web/components/ingredients/IngredientTable.tsx`
- Modify: `apps/web/app/(dashboard)/ingredientes/page.tsx`

- [ ] **Step 1: Update `IngredientTableProps` to add `onDelete`**

In `apps/web/components/ingredients/IngredientTable.tsx`, replace the `IngredientTableProps` type:

```ts
type IngredientTableProps = {
  items: IngredientListItem[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};
```

Update the function signature:

```ts
export function IngredientTable({ items, onEdit, onDelete }: IngredientTableProps) {
```

- [ ] **Step 2: Add a danger `ActionBtn` variant and "Excluir" button**

After the existing `ActionBtn` styled component, add:

```ts
const DangerBtn = styled.button`
  padding: 0.3rem 0.65rem;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: 1px solid #fecaca;
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.75rem;
  font-weight: 600;
  color: #dc2626;
  cursor: pointer;

  &:hover {
    background: #fef2f2;
    border-color: #dc2626;
  }
`;
```

In the table row, replace the `<Td>` that contains the "Editar" button:

```tsx
<Td>
  <div style={{ display: "flex", gap: "0.4rem" }}>
    <ActionBtn type="button" onClick={() => onEdit?.(row.id)}>
      Editar
    </ActionBtn>
    <DangerBtn type="button" onClick={() => onDelete?.(row.id)}>
      Excluir
    </DangerBtn>
  </div>
</Td>
```

- [ ] **Step 3: Update `ingredientes/page.tsx`**

Replace the full content of `apps/web/app/(dashboard)/ingredientes/page.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import {
  DeleteConfirmDialog,
  EditIngredientModal,
  IngredientModal,
  IngredientPageHeader,
  IngredientTable,
} from "@/components/ingredients";
import {
  useIngredients,
  useCreateRawMaterial,
  useCreateSemiFinished,
  useDeleteIngredient,
} from "@/hooks/useIngredients";
import { unitToLabel } from "@/lib/ingredient-math";
import type {
  IngredientFilter,
  IngredientListItem,
  IngredientRow,
} from "@/types/ingredients";

export default function IngredientesPage() {
  const [filter, setFilter] = useState<IngredientFilter>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<IngredientRow | null>(null);
  const [deletingIngredient, setDeletingIngredient] = useState<IngredientRow | null>(null);
  const [conflictList, setConflictList] = useState<string[]>([]);

  const { data: rows = [], isLoading } = useIngredients(filter);
  const createRaw = useCreateRawMaterial();
  const createSemi = useCreateSemiFinished();
  const deleteIngredient = useDeleteIngredient();

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

  const handleEdit = (id: string) => {
    const row = rows.find((r) => r.id === id) ?? null;
    setEditingIngredient(row);
  };

  const handleDelete = (id: string) => {
    const row = rows.find((r) => r.id === id) ?? null;
    setConflictList([]);
    setDeletingIngredient(row);
  };

  const handleDeleteConfirm = () => {
    if (!deletingIngredient) return;
    deleteIngredient.mutate(deletingIngredient.id, {
      onSuccess: () => {
        setDeletingIngredient(null);
        setConflictList([]);
      },
      onError: (err) => {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setConflictList(err.response.data?.usedIn ?? []);
        }
      },
    });
  };

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
        <IngredientTable
          items={tableItems}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
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
      <EditIngredientModal
        open={editingIngredient !== null}
        ingredient={editingIngredient}
        onClose={() => setEditingIngredient(null)}
        rawIngredients={rawIngredients}
      />
      <DeleteConfirmDialog
        open={deletingIngredient !== null}
        ingredientName={deletingIngredient?.name ?? ""}
        onClose={() => {
          setDeletingIngredient(null);
          setConflictList([]);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteIngredient.isPending}
        conflictList={conflictList}
      />
    </>
  );
}
```

- [ ] **Step 4: Verify the build passes**

```powershell
npm run build -w @vivi-gourmet/web 2>&1 | Select-String "error"
```

Expected: No TypeScript errors.

- [ ] **Step 5: Run the API tests one final time**

```powershell
npm run test -w @vivi-gourmet/api -- --testPathPattern=ingredients.service
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/components/ingredients/IngredientTable.tsx apps/web/app/"(dashboard)"/ingredientes/page.tsx
git commit -m "feat(web): wire edit and delete handlers in IngredientTable and ingredientes page"
```

---

## Final Checklist

- [ ] `npm run test -w @vivi-gourmet/api` — all tests pass
- [ ] `npm run build -w @vivi-gourmet/web` — no TypeScript errors
- [ ] `npm run dev` — app runs
- [ ] Login and navigate to /ingredientes
- [ ] Click "Editar" on a RAW ingredient — modal opens with name pre-filled, save updates the list
- [ ] Click "Editar" on a SEMI_FINISHED ingredient — modal opens with name/yield/items pre-filled
- [ ] Click "Excluir" on an ingredient not in use — dialog appears, confirming deletes and removes from list
- [ ] Click "Excluir" on an ingredient used in a recipe — dialog switches to conflict view listing recipe names
