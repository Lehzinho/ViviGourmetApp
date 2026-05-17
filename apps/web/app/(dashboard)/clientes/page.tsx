"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  CustomerModal,
  CustomerTable,
  DeleteCustomerDialog,
  NewOrderModal,
} from "@/components/customers";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { useCreateOrder } from "@/hooks/useOrders";
import type {
  CreateCustomerPayload,
  CreateOrderPayload,
  Customer,
  UpdateCustomerPayload,
} from "@/types/customers";

export default function ClientesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: customersResponse, isLoading } = useCustomers({
    search: search || undefined,
    page,
    limit: 20,
  });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [newOrderCustomer, setNewOrderCustomer] = useState<Customer | null>(null);
  const [createError, setCreateError] = useState<string | undefined>();
  const [editError, setEditError] = useState<string | undefined>();
  const [orderError, setOrderError] = useState<string | undefined>();

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const createOrder = useCreateOrder();

  const handleCreate = (payload: CreateCustomerPayload) => {
    setCreateError(undefined);
    createCustomer.mutate(payload, {
      onSuccess: () => setIsCreateOpen(false),
      onError: () => setCreateError("Erro ao cadastrar cliente. Tente novamente."),
    });
  };

  const handleUpdate = (payload: UpdateCustomerPayload) => {
    if (!editingCustomer) return;
    setEditError(undefined);
    updateCustomer.mutate(
      { id: editingCustomer.id, payload },
      {
        onSuccess: () => setEditingCustomer(null),
        onError: () => setEditError("Erro ao salvar. Tente novamente."),
      },
    );
  };

  const handleDeleteConfirm = () => {
    if (!deletingCustomer) return;
    deleteCustomer.mutate(deletingCustomer.id, {
      onSuccess: () => setDeletingCustomer(null),
    });
  };

  const handleNewOrder = (payload: CreateOrderPayload) => {
    setOrderError(undefined);
    createOrder.mutate(payload, {
      onSuccess: () => setNewOrderCustomer(null),
      onError: () => setOrderError("Erro ao registrar venda. Tente novamente."),
    });
  };

  const rows = customersResponse?.data ?? [];
  const total = customersResponse?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie seus clientes e histórico de vendas."
        actionLabel="Novo cliente"
        onAction={() => {
          setCreateError(undefined);
          setIsCreateOpen(true);
        }}
      />

      <div style={{ padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {isLoading ? (
          <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Carregando clientes…</p>
        ) : (
          <>
            <CustomerTable
              rows={rows}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              onView={(customer) => router.push(`/clientes/${customer.id}`)}
              onEdit={(customer) => {
                setEditError(undefined);
                setEditingCustomer(customer);
              }}
              onDelete={(customer) => setDeletingCustomer(customer)}
              onNewOrder={(customer) => {
                setOrderError(undefined);
                setNewOrderCustomer(customer);
              }}
            />

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: "8px",
                      border: `1px solid ${p === page ? "#E8593C" : "#e4e4e7"}`,
                      background: p === page ? "#fdf1ee" : "#fff",
                      color: p === page ? "#E8593C" : "#52525b",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CustomerModal
        mode="create"
        open={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setCreateError(undefined);
        }}
        onSubmit={handleCreate}
        isLoading={createCustomer.isPending}
        submitError={createError}
      />

      {editingCustomer && (
        <CustomerModal
          mode="edit"
          customer={editingCustomer}
          open={editingCustomer !== null}
          onClose={() => {
            setEditingCustomer(null);
            setEditError(undefined);
          }}
          onSubmit={handleUpdate}
          isLoading={updateCustomer.isPending}
          submitError={editError}
        />
      )}

      <DeleteCustomerDialog
        open={deletingCustomer !== null}
        customerName={deletingCustomer?.name ?? ""}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteCustomer.isPending}
      />

      <NewOrderModal
        open={newOrderCustomer !== null}
        customer={newOrderCustomer}
        onClose={() => {
          setNewOrderCustomer(null);
          setOrderError(undefined);
        }}
        onSubmit={handleNewOrder}
        isLoading={createOrder.isPending}
        submitError={orderError}
      />
    </>
  );
}
