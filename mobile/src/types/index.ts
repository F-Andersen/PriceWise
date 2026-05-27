export type Store = {
  id: string;
  name: string;
  logoUrl?: string;
  city: string;
  sourceUrl?: string;
};

export type Price = {
  id: string;
  productId: string;
  storeId: string;
  price: string | number;
  oldPrice?: string | number | null;
  discountPrice?: string | number | null;
  dateCollected: string;
  isAvailable: boolean;
  imageUrl?: string | null;
  store: Store;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  barcode: string;
  unit: string;
  volume: string;
  imageUrl?: string;
  description?: string;
  prices?: Price[];
};

export type ShoppingListItem = {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
};

export type ShoppingList = {
  id: string;
  title: string;
  createdAt: string;
  items: ShoppingListItem[];
};

export type ComparisonResult = {
  store: Store;
  totalPrice: number;
  foundCount: number;
  missingCount: number;
  missingProducts: string[];
  difference: number;
  isBest: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  items: Array<{ id: string; quantity: number; product: Product }>;
};

export type Offer = {
  id: string;
  product: Product;
  store: Store;
  imageUrl?: string | null;
  price: number;
  oldPrice: number;
  saveAmount: number;
  discountPercent: number;
  dateCollected: string;
  label: string;
};
