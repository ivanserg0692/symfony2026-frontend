export type Order = {
  id: number;
  status: "pending" | "canceled" | "completed";
  // Money is serialized as decimal strings by the order API.
  totalPrice: string;
  totalDiscount: string;
  finalPrice: string;
  createdAt: string;
  updatedAt: string;
};

export type OrderItem = {
  id: number;
  productSnapshotId: number;
  quantity: number;
  sort: number;
  unitPrice: string;
  unitDiscount: string;
  finalUnitPrice: string;
  lineTotal: string;
  createdAt: string;
};

export type OrderItemDetail = OrderItem & {
  productSnapshot: {
    id: number;
    originalProductId: number;
    product: {
      id: number;
      name: string;
      createdAt: string;
      active: boolean;
      createdBy: number;
      description: string | null;
      slug: string;
      pictureKey: string | null;
    };
  };
};

/** POST /orders creates from the current cart, with no required payload. */
export type CreatedOrder = Order & { items: OrderItem[] };

/** GET /orders/{id} additionally resolves historical product snapshots. */
export type OrderDetail = Order & { items: OrderItemDetail[] };
