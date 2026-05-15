import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  CreateRecipePayload,
  RecipeDetailRow,
  RecipeRow,
  UpdateRecipePayload,
} from "@/types/recipes";

const QUERY_KEY = "recipes";

export function useRecipes() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data } = await apiClient.get<RecipeRow[]>("/recipes");
      return data;
    },
  });
}

export function useRecipeDetail(id: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, id, "detail"],
    queryFn: async () => {
      const { data } = await apiClient.get<RecipeDetailRow>(`/recipes/${id}`);
      return data;
    },
    enabled: id !== null,
  });
}

export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRecipePayload) => {
      const { data } = await apiClient.post<RecipeDetailRow>("/recipes", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateRecipePayload }) => {
      const { data } = await apiClient.patch<RecipeDetailRow>(`/recipes/${id}`, payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/recipes/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
