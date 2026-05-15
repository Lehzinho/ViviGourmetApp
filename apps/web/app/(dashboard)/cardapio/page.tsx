"use client";

import { useState } from "react";
import axios from "axios";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DeleteMenuDialog,
  MenuItemsPanel,
  MenuModal,
  MenuTable,
} from "@/components/menus";
import {
  useCreateMenu,
  useDeleteMenu,
  useMenuDetail,
  useMenus,
  useUpdateMenu,
} from "@/hooks/useMenus";
import { useProducts } from "@/hooks/useProducts";
import type { MenuRow, CreateMenuPayload, UpdateMenuPayload } from "@/types/menus";

export default function CardapioPage() {
  const { data: menus = [], isLoading } = useMenus();
  const { data: allProducts = [] } = useProducts();

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const { data: menuDetail } = useMenuDetail(selectedMenuId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuRow | null>(null);
  const [deletingMenu, setDeletingMenu] = useState<MenuRow | null>(null);

  const [createError, setCreateError] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();

  const createMenu = useCreateMenu();
  const updateMenu = useUpdateMenu();
  const deleteMenu = useDeleteMenu();

  const handleCreate = (payload: CreateMenuPayload) => {
    setCreateError(undefined);
    createMenu.mutate(payload, {
      onSuccess: () => setCreateOpen(false),
      onError: (err) => {
        const msg = axios.isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message
          : undefined;
        setCreateError(typeof msg === "string" ? msg : "Erro ao criar cardápio.");
      },
    });
  };

  const handleUpdate = (payload: UpdateMenuPayload) => {
    if (!editingMenu) return;
    setEditError(undefined);
    updateMenu.mutate(
      { id: editingMenu.id, payload },
      {
        onSuccess: () => setEditingMenu(null),
        onError: (err) => {
          const msg = axios.isAxiosError(err)
            ? (err.response?.data as { message?: string })?.message
            : undefined;
          setEditError(typeof msg === "string" ? msg : "Erro ao atualizar cardápio.");
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deletingMenu) return;
    deleteMenu.mutate(deletingMenu.id, {
      onSuccess: () => {
        setDeletingMenu(null);
        if (selectedMenuId === deletingMenu.id) setSelectedMenuId(null);
      },
    });
  };

  if (selectedMenuId && menuDetail) {
    return (
      <MenuItemsPanel
        menu={menuDetail}
        allProducts={allProducts}
        onBack={() => setSelectedMenuId(null)}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Cardápio público"
        subtitle="Configure seus cardápios e gerencie os produtos exibidos."
        actionLabel="Novo cardápio"
        onAction={() => setCreateOpen(true)}
      />

      {isLoading ? (
        <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Carregando…</p>
      ) : (
        <MenuTable
          rows={menus}
          onManage={(id) => setSelectedMenuId(id)}
          onEdit={(row) => {
            setEditError(undefined);
            setEditingMenu(row);
          }}
          onDelete={(row) => setDeletingMenu(row)}
        />
      )}

      <MenuModal
        mode="create"
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateError(undefined);
        }}
        onSubmit={handleCreate}
        isLoading={createMenu.isPending}
        submitError={createError}
      />

      {editingMenu && (
        <MenuModal
          mode="edit"
          open={editingMenu !== null}
          menu={editingMenu}
          onClose={() => {
            setEditingMenu(null);
            setEditError(undefined);
          }}
          onSubmit={handleUpdate}
          isLoading={updateMenu.isPending}
          submitError={editError}
        />
      )}

      <DeleteMenuDialog
        open={deletingMenu !== null}
        menuName={deletingMenu?.name ?? ""}
        onClose={() => setDeletingMenu(null)}
        onConfirm={handleDelete}
        isLoading={deleteMenu.isPending}
      />
    </>
  );
}
