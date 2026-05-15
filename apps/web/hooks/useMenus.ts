import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import type {
  AddMenuItemPayload,
  CreateMenuPayload,
  MenuDetailRow,
  MenuItemRow,
  MenuRow,
  ReorderItemsPayload,
  UpdateMenuItemPayload,
  UpdateMenuPayload,
} from "@/types/menus";

const KEY = "menus";

export function useMenus() {
  return useQuery({
    queryKey: [KEY],
    queryFn: async () => {
      const { data } = await apiClient.get<MenuRow[]>("/menus");
      return data;
    },
  });
}

export function useMenuDetail(id: string | null) {
  return useQuery({
    queryKey: [KEY, id],
    queryFn: async () => {
      const { data } = await apiClient.get<MenuDetailRow>(`/menus/${id}`);
      return data;
    },
    enabled: id !== null,
  });
}

export function useCreateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateMenuPayload) => {
      const { data } = await apiClient.post<MenuRow>("/menus", payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateMenuPayload }) => {
      const { data } = await apiClient.patch<MenuRow>(`/menus/${id}`, payload);
      return data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [KEY] });
      qc.invalidateQueries({ queryKey: [KEY, id] });
    },
  });
}

export function useDeleteMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/menus/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useAddMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, payload }: { menuId: string; payload: AddMenuItemPayload }) => {
      const { data } = await apiClient.post<MenuItemRow>(`/menus/${menuId}/items`, payload);
      return data;
    },
    onSuccess: (_data, { menuId }) => qc.invalidateQueries({ queryKey: [KEY, menuId] }),
  });
}

export function useUpdateMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      menuId,
      itemId,
      payload,
    }: {
      menuId: string;
      itemId: string;
      payload: UpdateMenuItemPayload;
    }) => {
      const { data } = await apiClient.patch<MenuItemRow>(
        `/menus/${menuId}/items/${itemId}`,
        payload,
      );
      return data;
    },
    onSuccess: (_data, { menuId }) => qc.invalidateQueries({ queryKey: [KEY, menuId] }),
  });
}

export function useRemoveMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, itemId }: { menuId: string; itemId: string }) => {
      await apiClient.delete(`/menus/${menuId}/items/${itemId}`);
    },
    onSuccess: (_data, { menuId }) => qc.invalidateQueries({ queryKey: [KEY, menuId] }),
  });
}

export function useReorderMenuItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ menuId, payload }: { menuId: string; payload: ReorderItemsPayload }) => {
      const { data } = await apiClient.patch<MenuDetailRow>(
        `/menus/${menuId}/items/reorder`,
        payload,
      );
      return data;
    },
    onSuccess: (_data, { menuId }) => qc.invalidateQueries({ queryKey: [KEY, menuId] }),
  });
}
