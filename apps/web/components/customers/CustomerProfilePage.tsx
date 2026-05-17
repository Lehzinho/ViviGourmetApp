"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import type { CustomerProfile, Customer, Order } from "@/types/customers";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/types/customers";
import { CustomerModal } from "./CustomerModal";
import { NewOrderModal } from "./NewOrderModal";
import { useUpdateCustomer } from "@/hooks/useCustomers";
import { useCreateOrder } from "@/hooks/useOrders";
import type { UpdateCustomerPayload, CreateOrderPayload } from "@/types/customers";

const Page = styled.div`
  padding: 0 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const Avatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const CustomerName = styled.h1`
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ContactRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 0.5rem;
`;

const DateInfo = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-self: flex-start;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button<{ $primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  ${({ theme, $primary }) =>
    $primary
      ? `background: ${theme.colors.primary}; color: #fff; &:hover { background: ${theme.colors.primaryHover}; }`
      : `background: ${theme.colors.background}; color: ${theme.colors.text.secondary}; border: 1px solid ${theme.colors.border}; &:hover { border-color: ${theme.colors.neutral[400]}; }`}
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StatCard = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.1;
`;

const StatLabel = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.muted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
`;

const SmallCardsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const SmallCard = styled(StatCard)``;

const SmallCardLabel = styled.div`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const SmallCardValue = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SmallCardSub = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const OrdersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const OrderCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;
`;

const OrderHeader = styled.button`
  width: 100%;
  text-align: left;
  padding: 0.85rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-family: inherit;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[100]};
  }
`;

const OrderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
`;

const OrderNumber = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const OrderDate = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const OrderTotal = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: ${({ theme }) => theme.radius.full};
  font-size: 0.75rem;
  font-weight: 600;
  ${({ $status }) => {
    if ($status === "OPEN") return "background: #fef3c7; color: #b45309;";
    if ($status === "CLOSED") return "background: #dcfce7; color: #15803d;";
    return "background: #fee2e2; color: #b91c1c;";
  }}
`;

const OrderItems = styled.div`
  padding: 0.75rem 1rem;
`;

const OrderItemLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px dashed ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

const NotesSection = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 1.25rem;
`;

const NotesText = styled.p`
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const EmptyNotes = styled.p`
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const PageBtn = styled.button<{ $active?: boolean }>`
  padding: 0.35rem 0.75rem;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primaryMuted : theme.colors.background)};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text.secondary)};
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
`;

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR");

const formatDate2 = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function formatRelative(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoje";
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.floor(days / 7), "week");
  return rtf.format(-Math.floor(days / 30), "month");
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function getOrderTotal(order: Order): number {
  return order.items.reduce((s, i) => s + i.totalPrice, 0);
}

const ORDERS_PER_PAGE = 10;

type CustomerProfilePageProps = {
  profile: CustomerProfile;
};

export function CustomerProfilePage({ profile }: CustomerProfilePageProps) {
  const router = useRouter();
  const { customer, stats, recentOrders } = profile;

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [editError, setEditError] = useState<string | undefined>();
  const [orderError, setOrderError] = useState<string | undefined>();
  const [ordersPage, setOrdersPage] = useState(1);

  const updateCustomer = useUpdateCustomer();
  const createOrder = useCreateOrder();

  const toggleOrder = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEditSubmit = (payload: UpdateCustomerPayload) => {
    setEditError(undefined);
    updateCustomer.mutate(
      { id: customer.id, payload },
      {
        onSuccess: () => setIsEditOpen(false),
        onError: () => setEditError("Erro ao salvar. Tente novamente."),
      },
    );
  };

  const handleOrderSubmit = (payload: CreateOrderPayload) => {
    setOrderError(undefined);
    createOrder.mutate(payload, {
      onSuccess: () => setIsNewOrderOpen(false),
      onError: () => setOrderError("Erro ao registrar venda. Tente novamente."),
    });
  };

  const totalPages = Math.ceil(recentOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = recentOrders.slice(
    (ordersPage - 1) * ORDERS_PER_PAGE,
    ordersPage * ORDERS_PER_PAGE,
  );

  return (
    <Page>
      <BackBtn type="button" onClick={() => router.push("/clientes")}>
        ← Voltar para clientes
      </BackBtn>

      <Header>
        <Avatar>{getInitials(customer.name)}</Avatar>
        <HeaderInfo>
          <CustomerName>{customer.name}</CustomerName>
          <ContactRow>
            <span>📞 {customer.phone}</span>
            {customer.email && <span>✉ {customer.email}</span>}
          </ContactRow>
          <DateInfo>
            Cadastrado em {formatDate(customer.createdAt)}
          </DateInfo>
        </HeaderInfo>
        <HeaderActions>
          <ActionBtn type="button" onClick={() => setIsEditOpen(true)}>
            Editar cliente
          </ActionBtn>
          <ActionBtn type="button" $primary onClick={() => setIsNewOrderOpen(true)}>
            Registrar venda
          </ActionBtn>
        </HeaderActions>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatValue>{formatBRL(stats.totalSpent)}</StatValue>
          <StatLabel>Total Gasto</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.totalOrders}</StatValue>
          <StatLabel>Pedidos Realizados</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{formatBRL(stats.averageTicket)}</StatValue>
          <StatLabel>Ticket Médio</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>
            {stats.visitFrequency > 0 ? `${stats.visitFrequency} dias` : "—"}
          </StatValue>
          <StatLabel>Frequência de Visita</StatLabel>
        </StatCard>
      </StatsGrid>

      <SmallCardsRow>
        <SmallCard>
          <SmallCardLabel>Produto Favorito</SmallCardLabel>
          {stats.favoriteProduct ? (
            <>
              <SmallCardValue>{stats.favoriteProduct.name}</SmallCardValue>
              <SmallCardSub>Pedido {stats.favoriteProduct.timesOrdered}×</SmallCardSub>
            </>
          ) : (
            <SmallCardValue style={{ fontWeight: 400, fontSize: "0.875rem", color: "#71717a" }}>
              Sem dados
            </SmallCardValue>
          )}
        </SmallCard>
        <SmallCard>
          <SmallCardLabel>Último Pedido</SmallCardLabel>
          <SmallCardValue>{formatBRL(stats.lastOrderAmount)}</SmallCardValue>
          <SmallCardSub>
            {stats.lastVisitAt ? formatRelative(stats.lastVisitAt) : "—"}
          </SmallCardSub>
        </SmallCard>
      </SmallCardsRow>

      <div>
        <SectionHeader>
          <SectionTitle>Histórico de Pedidos</SectionTitle>
          <ActionBtn type="button" $primary onClick={() => setIsNewOrderOpen(true)}>
            Nova venda
          </ActionBtn>
        </SectionHeader>

        <OrdersList style={{ marginTop: "1rem" }}>
          {paginatedOrders.length === 0 ? (
            <p style={{ color: "#71717a", fontSize: "0.875rem" }}>Nenhum pedido registrado.</p>
          ) : (
            paginatedOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const orderTotal = getOrderTotal(order);
              return (
                <OrderCard key={order.id}>
                  <OrderHeader type="button" onClick={() => toggleOrder(order.id)}>
                    <OrderMeta>
                      <OrderNumber>Pedido #{String(order.orderNumber).padStart(3, "0")}</OrderNumber>
                      <OrderDate>{formatDate2(order.openedAt)}</OrderDate>
                      <OrderTotal>{formatBRL(orderTotal)}</OrderTotal>
                      {order.paymentMethod && (
                        <span style={{ fontSize: "0.8125rem", color: "#71717a" }}>
                          {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                        </span>
                      )}
                    </OrderMeta>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <StatusBadge $status={order.status}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </StatusBadge>
                      <span style={{ color: "#71717a", fontSize: "0.8125rem" }}>
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </OrderHeader>
                  {isExpanded && (
                    <OrderItems>
                      {order.items.map((item) => (
                        <OrderItemLine key={item.id}>
                          <span>
                            {item.quantity}× {item.product.name}
                          </span>
                          <span>{formatBRL(item.totalPrice)}</span>
                        </OrderItemLine>
                      ))}
                    </OrderItems>
                  )}
                </OrderCard>
              );
            })
          )}
        </OrdersList>

        {totalPages > 1 && (
          <Pagination>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <PageBtn
                key={p}
                type="button"
                $active={p === ordersPage}
                onClick={() => setOrdersPage(p)}
              >
                {p}
              </PageBtn>
            ))}
          </Pagination>
        )}
      </div>

      {customer.notes && (
        <NotesSection>
          <SectionTitle>Observações</SectionTitle>
          <NotesText>{customer.notes}</NotesText>
        </NotesSection>
      )}
      {!customer.notes && (
        <NotesSection>
          <SectionTitle>Observações</SectionTitle>
          <EmptyNotes>Nenhuma observação registrada.</EmptyNotes>
        </NotesSection>
      )}

      <CustomerModal
        mode="edit"
        customer={customer}
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditError(undefined);
        }}
        onSubmit={handleEditSubmit}
        isLoading={updateCustomer.isPending}
        submitError={editError}
      />

      <NewOrderModal
        open={isNewOrderOpen}
        customer={customer}
        onClose={() => {
          setIsNewOrderOpen(false);
          setOrderError(undefined);
        }}
        onSubmit={handleOrderSubmit}
        isLoading={createOrder.isPending}
        submitError={orderError}
      />
    </Page>
  );
}
