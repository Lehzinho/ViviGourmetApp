"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DeleteExpenseDialog,
  ExpenseFiltersBar,
  ExpenseModal,
  ExpenseSummaryCard,
  ExpenseTable,
} from "@/components/expenses";
import { useCreateExpense, useDeleteExpense, useExpenses, useUpdateExpense } from "@/hooks/useExpenses";
import type { CreateExpensePayload, Expense, ExpenseFilters, UpdateExpensePayload } from "@/types/expenses";

export default function DespesasPage() {
  const now = new Date();
  const [summaryDate, setSummaryDate] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const [filters, setFilters] = useState<ExpenseFilters>({});
  const { data: expensesResponse, isLoading } = useExpenses(filters);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [createError, setCreateError] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const handlePrevMonth = () => {
    setSummaryDate(({ year, month }) =>
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
    );
  };

  const handleNextMonth = () => {
    setSummaryDate(({ year, month }) =>
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 },
    );
  };

  const handleCreate = (payload: CreateExpensePayload) => {
    setCreateError(undefined);
    createExpense.mutate(payload, {
      onSuccess: () => setIsCreateOpen(false),
      onError: () => setCreateError("Erro ao criar despesa. Tente novamente."),
    });
  };

  const handleUpdate = (payload: UpdateExpensePayload) => {
    if (!editingExpense) return;
    setEditError(undefined);
    updateExpense.mutate(
      { id: editingExpense.id, payload },
      {
        onSuccess: () => setEditingExpense(null),
        onError: () => setEditError("Erro ao salvar. Tente novamente."),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingExpense) return;
    deleteExpense.mutate(deletingExpense.id, {
      onSuccess: () => setDeletingExpense(null),
    });
  };

  return (
    <>
      <PageHeader
        title="Despesas"
        subtitle="Gerencie os custos operacionais do seu negócio."
        actionLabel="Nova despesa"
        onAction={() => {
          setCreateError(undefined);
          setIsCreateOpen(true);
        }}
      />

      <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <ExpenseSummaryCard
          year={summaryDate.year}
          month={summaryDate.month}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />

        <ExpenseFiltersBar filters={filters} onChange={setFilters} />

        {isLoading ? (
          <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Carregando despesas…</p>
        ) : (
          <ExpenseTable
            rows={expensesResponse?.data ?? []}
            onEdit={(expense) => {
              setEditError(undefined);
              setEditingExpense(expense);
            }}
            onDelete={(expense) => setDeletingExpense(expense)}
          />
        )}
      </div>

      <ExpenseModal
        mode="create"
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(undefined);
        }}
        onSubmit={handleCreate}
        isLoading={createExpense.isPending}
        submitError={createError}
      />

      {editingExpense && (
        <ExpenseModal
          mode="edit"
          expense={editingExpense}
          open={editingExpense !== null}
          onClose={() => {
            setEditingExpense(null);
            setEditError(undefined);
          }}
          onSubmit={handleUpdate}
          isLoading={updateExpense.isPending}
          submitError={editError}
        />
      )}

      <DeleteExpenseDialog
        open={deletingExpense !== null}
        expenseName={deletingExpense?.name ?? ""}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteExpense.isPending}
      />
    </>
  );
}
