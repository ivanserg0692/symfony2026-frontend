export type CatalogPicture = {
  thumbnailUrl: string;
  cardUrl: string;
  fullUrl: string;
  alt: string;
  creator: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  attribution: string;
};

export type CatalogSection = {
  id: number;
  name: string | null;
  slug: string | null;
  active: boolean | null;
  description: string | null;
  level: number | null;
  sort: number | null;
  parentId: number | null;
  picture: CatalogPicture | null;
};

export type CatalogPrice = {
  id: number | null;
  priceType: {
    id: number | null;
    code: string | null;
    name: string | null;
    description?: string | null;
    active: boolean | null;
    sort: number | null;
  } | null;
  /** Integer minor units, unlike the decimal strings returned by orders. */
  price: number | null;
  currency: string | null;
  active: boolean | null;
  validFrom: string | null;
  validTo: string | null;
};

export type CatalogElement = {
  id: number;
  name: string | null;
  active: boolean | null;
  description: string | null;
  slug: string | null;
  sort: number | null;
  productPrices: CatalogPrice[];
  totalStock: number;
  picture: CatalogPicture | null;
};

export type CatalogElementDetail = CatalogElement & {
  sections: CatalogSection[];
};
