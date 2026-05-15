import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  CreateExpensePayload,
  Expense,
  ExpenseFilters,
  ExpensesResponse,
  MonthlySummary,
  UpdateExpensePayload,
} from "@/types/expenses";

const KEY = "expenses";

function buildParams(filters?: ExpenseFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters?.from) params.from = filters.from;
  if (filters?.to) params.to = filters.to;
  if (filters?.category) params.category = filters.category;
  if (filters?.recurrence) params.recurrence = filters.recurrence;
  return params;
}

export function useExpenses(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: [KEY, filters ?? {}],
    queryFn: async () => {
      const { data } = await apiClient.get<ExpensesResponse>("/expenses", {
        params: buildParams(filters),
      });
      return data;
    },
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<Expense>(`/expenses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useExpenseSummary(year: number, month: number) {
  return useQuery({
    queryKey: [KEY, "summary", year, month],
    queryFn: async () => {
      const { data } = await apiClient.get<MonthlySummary>("/expenses/summary", {
        params: { year: String(year), month: String(month) },
      });
      return data;
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const { data } = await apiClient.post<Expense>("/expenses", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateExpensePayload }) => {
      const { data } = await apiClient.patch<Expense>(`/expenses/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/expenses/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
