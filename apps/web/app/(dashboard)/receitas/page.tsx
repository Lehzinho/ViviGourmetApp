"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { useIngredients } from "@/hooks/useIngredients";
import {
  useCreateRecipe,
  useDeleteRecipe,
  useRecipes,
  useUpdateRecipe,
} from "@/hooks/useRecipes";
import type { IngredientListItem } from "@/types/ingredients";
import type { CreateRecipePayload, RecipeRow, UpdateRecipePayload } from "@/types/recipes";
import { unitToLabel } from "@/lib/ingredient-math";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DeleteRecipeDialog,
  EditRecipeModal,
  RecipeModal,
  RecipeTable,
} from "@/components/recipes";

export default function ReceitasPage() {
  const { data: rows = [], isLoading } = useRecipes();
  const { data: ingredientRows = [] } = useIngredients("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeRow | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<RecipeRow | null>(null);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [conflictList, setConflictList] = useState<string[]>([]);

  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();

  const allIngredients: IngredientListItem[] = useMemo(
    () =>
      ingredientRows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        unit: r.unit,
        unitLabel: unitToLabel(r.unit),
        unitCost: r.latestPricePerUnit,
        createdAt: r.createdAt,
      })),
    [ingredientRows],
  );

  const handleCreate = (payload: CreateRecipePayload) => {
    setCreateError("");
    createRecipe.mutate(payload, {
      onSuccess: () => setCreateOpen(false),
      onError: () => setCreateError("Erro ao criar receita. Tente novamente."),
    });
  };

  const handleUpdate = (id: string, payload: UpdateRecipePayload) => {
    setEditError("");
    updateRecipe.mutate(
      { id, payload },
      {
        onSuccess: () => setEditingRecipe(null),
        onError: () => setEditError("Erro ao salvar. Tente novamente."),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingRecipe) return;
    deleteRecipe.mutate(deletingRecipe.id, {
      onSuccess: () => {
        setDeletingRecipe(null);
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
      <PageHeader
        title="Receitas"
        subtitle="Composições de ingredientes para cálculo de custo."
        actionLabel="Nova receita"
        onAction={() => {
          setCreateError("");
          setCreateOpen(true);
        }}
      />

      <div style={{ padding: "0 1.5rem 1.5rem" }}>
        {isLoading ? (
          <p style={{ color: "#71717a" }}>Carregando receitas…</p>
        ) : (
          <RecipeTable
            rows={rows}
            onEdit={(id) => {
              const recipe = rows.find((r) => r.id === id) ?? null;
              setEditError("");
              setEditingRecipe(recipe);
            }}
            onDelete={(id) => {
              const recipe = rows.find((r) => r.id === id) ?? null;
              setConflictList([]);
              setDeletingRecipe(recipe);
            }}
          />
        )}
      </div>

      <RecipeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        allIngredients={allIngredients}
        onSubmit={handleCreate}
        isLoading={createRecipe.isPending}
        submitError={createError}
      />

      <EditRecipeModal
        open={editingRecipe !== null}
        recipe={editingRecipe}
        onClose={() => setEditingRecipe(null)}
        allIngredients={allIngredients}
        onSubmit={handleUpdate}
        isLoading={updateRecipe.isPending}
        submitError={editError}
      />

      <DeleteRecipeDialog
        open={deletingRecipe !== null}
        recipeName={deletingRecipe?.name ?? ""}
        onClose={() => {
          setDeletingRecipe(null);
          setConflictList([]);
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteRecipe.isPending}
        conflictList={conflictList}
      />
    </>
  );
}
