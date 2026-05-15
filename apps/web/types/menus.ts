export interface MenuRow {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  isPublic: boolean;
  createdAt: string;
  itemCount: number;
}

export interface MenuItemRow {
  id: string;
  menuId: string;
  productId: string;
  productName: string;
  sellingPrice: number;
  isVisible: boolean;
  order: number;
}

export interface MenuDetailRow extends Omit<MenuRow, "itemCount"> {
  items: MenuItemRow[];
}

export interface CreateMenuPayload {
  name: string;
  slug?: string;
  isPublic?: boolean;
}

export interface UpdateMenuPayload {
  name?: string;
  slug?: string;
  isPublic?: boolean;
}

export interface AddMenuItemPayload {
  productId: string;
  isVisible?: boolean;
  order?: number;
}

export interface UpdateMenuItemPayload {
  isVisible?: boolean;
  order?: number;
}

export interface ReorderItemsPayload {
  items: { id: string; order: number }[];
}
