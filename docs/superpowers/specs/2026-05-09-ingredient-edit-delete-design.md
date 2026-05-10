# Ingredient Edit & Delete — Design Spec

**Date:** 2026-05-09

## Goal

Allow users to edit an ingredient's name (RAW) or name/yield/composition (SEMI_FINISHED), and to soft-delete ingredients with a guard that blocks deletion when the ingredient is referenced by any recipe item.

---

## Scope

### What changes

| Layer | Change |
|-------|--------|
| API — `IngredientsService` | Add `update(id, dto, companyId)` and `remove(id, companyId)` methods |
| API — DTOs | `UpdateRawMaterialDto` (name only), `UpdateSemiFinishedDto` (name, yield, yieldUnit, items[]) |
| API — `IngredientsController` | `PATCH /ingredients/:id` and `DELETE /ingredients/:id` routes |
| Web — types | `UpdateRawMaterialPayload`, `UpdateSemiFinishedPayload` in `types/ingredients.ts` |
| Web — hooks | `useUpdateIngredient()`, `useDeleteIngredient()` in `hooks/useIngredients.ts` |
| Web — components | New `EditIngredientModal`, new `DeleteConfirmDialog` |
| Web — `IngredientTable` | Wire `onEdit`, add `onDelete` prop and "Excluir" button column |
| Web — ingredientes page | Manage `editingId`, `deletingId` state; pass handlers to table and modals |

### What does NOT change

- Ingredient type (`RAW`/`SEMI_FINISHED`) cannot be changed after creation.
- `IngredientPrice` records are never mutated (append-only pricing rule unchanged).
- `IngredientModal` (creation modal) is untouched.

---

## API Design

### `PATCH /ingredients/:id`

**Guard:** `JwtAuthGuard`. Resolves `companyId` from token.

**RAW body:**
```json
{ "name": "Farinha de trigo" }
```

**SEMI_FINISHED body:**
```json
{
  "name": "Massa pré-assada",
  "yield": 0.9,
  "yieldUnit": "KG",
  "items": [
    { "ingredientId": "<uuid>", "quantity": 0.5 }
  ]
}
```

**Service logic — `update(id, dto, companyId)`:**
1. Load ingredient; verify `companyId` matches; throw `404` if not found or soft-deleted.
2. If RAW: `prisma.ingredient.update({ name })`.
3. If SEMI_FINISHED:
   - In a single transaction:
     - `prisma.ingredient.update({ name, compositionRecipe: { update: { yield, yieldUnit } } })`
     - Delete all existing `RecipeItem`s for the composition recipe.
     - Create new `RecipeItem`s from `dto.items`.
   - Call `costCalculatorService.invalidateIngredientCache(id, companyId)` after commit.
4. Return the updated `IngredientRow` (same shape as `GET /ingredients`).

**HTTP responses:** `200 OK` with updated ingredient row. `404` if not found. `422` on validation error.

---

### `DELETE /ingredients/:id`

**Guard:** `JwtAuthGuard`. Resolves `companyId` from token.

**Service logic — `remove(id, companyId)`:**
1. Load ingredient; verify `companyId`; throw `404` if not found or soft-deleted.
2. Find all `RecipeItem` rows where `ingredientId = id` (joining to get parent recipe name).
3. If any found → throw `409 Conflict` with body:
   ```json
   {
     "statusCode": 409,
     "message": "Ingrediente em uso",
     "usedIn": ["Receita A", "Receita B"]
   }
   ```
4. If none → `prisma.ingredient.update({ deletedAt: new Date() })` (soft delete).
5. Return `204 No Content`.

---

## Frontend Design

### New types (`types/ingredients.ts`)

```ts
export type UpdateRawMaterialPayload = { name: string };
export type UpdateSemiFinishedPayload = {
  name: string;
  yield: number;
  yieldUnit: string;
  items: { ingredientId: string; quantity: number }[];
};
```

### New hooks (`hooks/useIngredients.ts`)

```ts
useUpdateIngredient() // PATCH /ingredients/:id, invalidates ["ingredients"]
useDeleteIngredient() // DELETE /ingredients/:id, invalidates ["ingredients"]
```

Both invalidate `["ingredients"]` on success.

---

### `EditIngredientModal`

**Props:**
```ts
{
  open: boolean;
  ingredient: IngredientRow | null;   // null = closed
  onClose: () => void;
  rawIngredients: IngredientListItem[]; // for SEMI_FINISHED item picker
}
```

**Behavior:**
- When `ingredient` changes, reset form state to ingredient's current values.
- RAW form: single "Nome" field.
- SEMI_FINISHED form: "Nome", "Rendimento", "Unidade de rendimento", editable items list (same sub-form used in `IngredientModal`).
- On submit: calls `useUpdateIngredient().mutate({ id, payload })`, closes on success.
- Validation: name required; SEMI_FINISHED requires at least 1 item and yield > 0.

---

### `DeleteConfirmDialog`

**Props:**
```ts
{
  open: boolean;
  ingredientName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  conflictList?: string[]; // populated on 409 response
}
```

**Behavior:**
- Default state: "Deseja excluir **{name}**? Esta ação não pode ser desfeita." + "Cancelar" / "Excluir" buttons.
- If `conflictList` is set (after 409): replaces content with error message listing the recipes that use the ingredient. Only shows "Fechar" button.
- "Excluir" button disabled when `isLoading`.

---

### `IngredientTable` changes

Add `onDelete?: (id: string) => void` prop. Add "Excluir" button column (destructive style) next to "Editar". `onEdit` already exists.

---

### `ingredientes/page.tsx` changes

```ts
const [editingId, setEditingId] = useState<string | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);
const [conflictList, setConflictList] = useState<string[]>([]);
```

- `editingId` → find `rows.find(r => r.id === editingId)` → pass to `EditIngredientModal`.
- `deletingId` → find name for dialog label → open `DeleteConfirmDialog`.
- On delete confirm: call `deleteIngredient.mutate(deletingId)`:
  - Success → close dialog, invalidation handled by hook.
  - 409 → set `conflictList` from response body → dialog shows error state.

---

## Error States

| Scenario | API response | UI |
|----------|-------------|-----|
| Ingredient not found | 404 | Toast/alert "Ingrediente não encontrado" |
| Ingredient in use (delete) | 409 + `usedIn[]` | Dialog switches to conflict view listing recipes |
| Validation error (edit) | 422 | Inline field errors |
| Network error | 5xx / network | Generic "Erro ao conectar com o servidor" |

---

## Out of Scope

- Editing ingredient unit (RAW) — avoided to preserve price record integrity.
- Bulk delete.
- Undo/restore soft-deleted ingredients.
- Hard delete.
