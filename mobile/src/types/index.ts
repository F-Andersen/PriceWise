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
  /** Останній день акції, якщо магазин його вказав. */
  promoEndsAt?: string | null;
  dateCollected: string;
  isAvailable: boolean;
  imageUrl?: string | null;
  sourceUrl?: string | null;
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

export type ComparisonItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  hasDiscount: boolean;
};

export type ComparisonResult = {
  store: Store;
  totalPrice: number;
  foundCount: number;
  missingCount: number;
  missingProducts: string[];
  difference: number;
  isBest: boolean;
  items?: ComparisonItem[];
};

export type Recommendation = {
  type: string;
  message: string;
  saveAmount?: number;
  product?: Product;
  alternative?: Product;
  store?: Store;
};

export type Alternative = {
  product: Product;
  saveAmount: number;
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  guide?: {
    durationMinutes: number;
    servings: number;
    difficulty: "Легко" | "Середньо";
    steps: string[];
  };
  items: Array<{ id: string; quantity: number; product: Product }>;
};

export type Offer = {
  id: string;
  product: Product;
  store: Store;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  price: number;
  oldPrice: number;
  saveAmount: number;
  discountPercent: number;
  dateCollected: string;
  promoEndsAt?: string | null;
  label: string;
};

export type MarketPrice = Price & {
  product: Product;
  matchType: "exact" | "similar";
};
