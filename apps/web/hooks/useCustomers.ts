import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  CreateCustomerPayload,
  Customer,
  CustomerProfile,
  CustomersResponse,
  UpdateCustomerPayload,
} from "@/types/customers";

const KEY = "customers";

export function useCustomers(filters?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [KEY, filters ?? {}],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      const { data } = await apiClient.get<CustomersResponse>("/customers", { params });
      return data;
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<Customer>(`/customers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCustomerProfile(id: string) {
  return useQuery({
    queryKey: [KEY, id, "profile"],
    queryFn: async () => {
      const { data } = await apiClient.get<CustomerProfile>(`/customers/${id}/profile`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCustomerPayload) => {
      const { data } = await apiClient.post<Customer>("/customers", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateCustomerPayload }) => {
      const { data } = await apiClient.patch<Customer>(`/customers/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/customers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
