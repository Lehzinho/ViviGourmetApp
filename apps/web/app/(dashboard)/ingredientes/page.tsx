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
  const { data: allRawRows = [] } = useIngredients("RAW");
  const createRaw = useCreateRawMaterial();
  const createSemi = useCreateSemiFinished();
  const deleteIngredient = useDeleteIngredient();

  const rawIngredients = useMemo<IngredientListItem[]>(
    () =>
      allRawRows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        unit: r.unit,
        unitLabel: unitToLabel(r.unit),
        unitCost: r.latestPricePerUnit,
        createdAt: r.createdAt,
      })),
    [allRawRows],
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
