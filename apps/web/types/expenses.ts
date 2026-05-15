export type RecurrenceType = "monthly" | "weekly" | "one_time";

export const EXPENSE_CATEGORIES = [
  "Aluguel",
  "Energia elétrica",
  "Água e gás",
  "Embalagens",
  "Marketing",
  "Mão de obra",
  "Equipamentos",
  "Limpeza",
  "Transporte",
  "Outros",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  monthly: "Mensal",
  weekly: "Semanal",
  one_time: "Avulso",
};

export type Expense = {
  id: string;
  companyId: string;
  name: string;
  amount: number;
  category: string;
  recurrence: RecurrenceType;
  date: string;
  notes?: string;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpensesResponse = {
  data: Expense[];
  total: number;
  count: number;
};

export type MonthlySummary = {
  total: number;
  byCategory: Record<string, number>;
  count: number;
};

export type CreateExpensePayload = {
  name: string;
  amount: number;
  category: string;
  recurrence: RecurrenceType;
  date: string;
  notes?: string;
};

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export type ExpenseFilters = {
  from?: string;
  to?: string;
  category?: string;
  recurrence?: RecurrenceType;
};
