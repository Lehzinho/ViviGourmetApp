import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  CreateRawMaterialPayload,
  CreateSemiFinishedPayload,
  IngredientDetailRow,
  IngredientFilter,
  IngredientRow,
  UpdateRawMaterialPayload,
  UpdateSemiFinishedPayload,
} from "@/types/ingredients";

const QUERY_KEY = "ingredients";

function buildQueryParams(filter: IngredientFilter) {
  if (filter === "all") return "";
  return `?type=${filter}`;
}

export function useIngredients(filter: IngredientFilter = "all") {
  return useQuery({
    queryKey: [QUERY_KEY, filter],
    queryFn: async () => {
      const { data } = await apiClient.get<IngredientRow[]>(
        `/ingredients${buildQueryParams(filter)}`,
      );
      return data;
    },
  });
}

export function useCreateRawMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRawMaterialPayload) => {
      const { data } = await apiClient.post<IngredientRow>("/ingredients/raw", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useCreateSemiFinished() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSemiFinishedPayload) => {
      const { data } = await apiClient.post<IngredientRow>(
        "/ingredients/semi-finished",
        payload,
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useAddPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ingredientId,
      price,
      quantity,
    }: {
      ingredientId: string;
      price: number;
      quantity: number;
    }) => {
      await apiClient.post(`/ingredients/${ingredientId}/prices`, { price, quantity });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

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

export function useDeleteIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/ingredients/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
