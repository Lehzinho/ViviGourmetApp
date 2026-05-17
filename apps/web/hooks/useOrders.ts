import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type { CreateOrderPayload, Order, UpdateOrderPayload } from "@/types/customers";

const KEY = "orders";
const CUSTOMERS_KEY = "customers";

export function useOrders(filters?: {
  customerId?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: [KEY, filters ?? {}],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.customerId) params.customerId = filters.customerId;
      if (filters?.status) params.status = filters.status;
      if (filters?.from) params.from = filters.from;
      if (filters?.to) params.to = filters.to;
      const { data } = await apiClient.get<Order[]>("/orders", { params });
      return data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<Order>(`/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data } = await apiClient.post<Order>("/orders", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateOrderPayload }) => {
      const { data } = await apiClient.patch<Order>(`/orders/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<Order>(`/orders/${id}/cancel`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
