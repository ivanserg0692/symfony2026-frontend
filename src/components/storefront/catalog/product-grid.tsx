import type { CatalogElement } from "@/types/catalog";
import { ProductCard } from "./product-card";

export const ProductGrid = ({ products }: { products: readonly CatalogElement[] }) => (
  <ul className="storefront-products">
    {products.map((product) => (
      <li key={product.id}><ProductCard product={product} /></li>
    ))}
  </ul>
);
