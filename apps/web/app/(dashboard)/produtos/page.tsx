"use client";

import { useMemo, useState } from "react";
import { useIngredients } from "@/hooks/useIngredients";
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/hooks/useProducts";
import type { IngredientListItem } from "@/types/ingredients";
import type { CreateProductPayload, ProductRow, UpdateProductPayload } from "@/types/products";
import { unitToLabel } from "@/lib/ingredient-math";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DeleteProductDialog,
  EditProductModal,
  ProductModal,
  ProductTable,
} from "@/components/products";

export default function ProdutosPage() {
  const { data: rows = [] } = useProducts();
  const { data: ingredientRows = [] } = useIngredients("all");

  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const allIngredients: IngredientListItem[] = useMemo(
    () =>
      ingredientRows.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        unit: r.unit,
        unitLabel: unitToLabel(r.unit),
        unitCost: r.latestPricePerUnit,
        createdAt: r.createdAt,
      })),
    [ingredientRows],
  );

  const handleCreate = (payload: CreateProductPayload) => {
    setCreateError("");
    createProduct.mutate(payload, {
      onSuccess: () => setCreateOpen(false),
      onError: () => setCreateError("Erro ao criar produto. Tente novamente."),
    });
  };

  const handleUpdate = (id: string, payload: UpdateProductPayload) => {
    setEditError("");
    updateProduct.mutate(
      { id, payload },
      {
        onSuccess: () => setEditingProduct(null),
        onError: () => setEditError("Erro ao salvar. Tente novamente."),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingProduct) return;
    deleteProduct.mutate(deletingProduct.id, {
      onSuccess: () => setDeletingProduct(null),
    });
  };

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle="Produtos finais vinculados a receitas e precificação."
        actionLabel="Novo produto"
        onAction={() => {
          setCreateError("");
          setCreateOpen(true);
        }}
      />

      <div style={{ padding: "0 1.5rem 1.5rem" }}>
        <ProductTable
          rows={rows}
          onEdit={(id) => {
            const product = rows.find((r) => r.id === id) ?? null;
            setEditError("");
            setEditingProduct(product);
          }}
          onDelete={(id) => {
            const product = rows.find((r) => r.id === id) ?? null;
            setDeletingProduct(product);
          }}
        />
      </div>

      <ProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        allIngredients={allIngredients}
        onSubmit={handleCreate}
        isLoading={createProduct.isPending}
        submitError={createError}
      />

      <EditProductModal
        open={editingProduct !== null}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        allIngredients={allIngredients}
        onSubmit={handleUpdate}
        isLoading={updateProduct.isPending}
        submitError={editError}
      />

      <DeleteProductDialog
        open={deletingProduct !== null}
        productName={deletingProduct?.name ?? ""}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteProduct.isPending}
      />
    </>
  );
}
