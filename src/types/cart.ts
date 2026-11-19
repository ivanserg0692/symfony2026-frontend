export type CartItem = {
  id: number;
  catalogElementId: number;
  quantity: number;
  sort: number;
  createdAt: string;
  updatedAt: string;
};

export type Cart = {
  id: number | null;
  status: "active" | null;
  createdAt: string | null;
  updatedAt: string | null;
  items: CartItem[];
};

export type AddCartItem = {
  /** Catalog element id; this is not the Product entity id. */
  productId: number;
  /** Quantity to add to any existing cart position. */
  quantity: number;
};

/** PATCH /cart/items/{cartItemId}; quantity is absolute, not an increment. */
export type UpdateCartItem =
  | { quantity: number; sort?: number }
  | { quantity?: number; sort: number };
