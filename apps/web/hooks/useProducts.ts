import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  CreateProductPayload,
  ProductCostResult,
  ProductDetailRow,
  ProductRow,
  UpdateProductPayload,
} from "@/types/products";

const QUERY_KEY = "products";

export function useProducts() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductRow[]>("/products");
      return data;
    },
  });
}

export function useProductDetail(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, id, "detail"],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductDetailRow>(`/products/${id}`);
      return data;
    },
    enabled: id !== null,
  });
}

export function useProductCost(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, id, "cost"],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductCostResult>(`/products/${id}/cost`);
      return data;
    },
    enabled: id !== null,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      const { data } = await apiClient.post<ProductDetailRow>("/products", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateProductPayload }) => {
      const { data } = await apiClient.patch<ProductDetailRow>(`/products/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/products/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
