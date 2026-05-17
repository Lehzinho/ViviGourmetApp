export type Customer = {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  avatarUrl?: string | null;
  lastVisitAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number };
  totalSpent?: number;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
  product: { id: string; name: string };
};

export type Order = {
  id: string;
  companyId: string;
  customerId?: string | null;
  orderNumber: number;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  paymentMethod?: string | null;
  discount?: number | null;
  notes?: string | null;
  tableNumber?: string | null;
  openedAt: string;
  closedAt?: string | null;
  createdAt: string;
  customer?: Pick<Customer, "id" | "name" | "phone"> | null;
  items: OrderItem[];
};

export type CustomerStats = {
  totalSpent: number;
  totalOrders: number;
  averageTicket: number;
  lastOrderAmount: number;
  lastVisitAt: string | null;
  totalItemsConsumed: number;
  visitFrequency: number;
  favoriteProduct: { id: string; name: string; timesOrdered: number } | null;
  favoriteCategory: string | null;
  totalDiscount: number;
};

export type CustomerProfile = {
  customer: Customer;
  stats: CustomerStats;
  recentOrders: Order[];
};

export type CustomersResponse = {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
};

export type CreateCustomerPayload = {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export type CreateOrderItemPayload = {
  productId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type CreateOrderPayload = {
  customerId?: string;
  paymentMethod?: string;
  notes?: string;
  items: CreateOrderItemPayload[];
};

export type UpdateOrderPayload = {
  paymentMethod?: string;
  notes?: string;
  status?: "OPEN" | "CLOSED" | "CANCELLED";
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  outro: "Outro",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: "Aberto",
  CLOSED: "Fechado",
  CANCELLED: "Cancelado",
};
