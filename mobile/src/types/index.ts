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
  /** Коли ця ціна з'явилась (початок періоду). */
  dateCollected: string;
  /** Останній збір, який підтвердив цю ціну. */
  lastSeenAt?: string;
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

/** Рядок кошика, знайдений у магазині. */
export type ComparisonItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  hasDiscount: boolean;
  checkedAt: string;
};

/** Товар кошика, якого немає в магазині, і чому. */
export type MissingItem = {
  productId: string;
  productName: string;
  quantity: number;
  /** unavailable — магазин позначив «немає в наявності»; no_price — у базі немає ціни. */
  reason: "unavailable" | "no_price";
};

export type ComparisonResult = {
  store: Store;
  status: "complete" | "partial" | "no_data";
  totalPrice: number;
  foundCount: number;
  missingCount: number;
  items: ComparisonItem[];
  missing: MissingItem[];
  missingProducts: string[];
  /** Лише для найдешевшого серед двох і більше повних кошиків. */
  isBest: boolean;
  /** Різниця з найдешевшим повним кошиком; null, якщо порівнювати не можна. */
  difference: number | null;
  /** Найстаріша перевірка серед використаних цін. */
  checkedAt: string | null;
};

export type BasketVerdict =
  | { kind: "empty" }
  | { kind: "cheapest"; storeIds: string[]; total: number; spread: number; completeCount: number }
  | { kind: "single_complete"; storeId: string; total: number; partialCount: number }
  | { kind: "none_complete"; partialCount: number };

/** Відповідь API порівняння: вердикт і магазини (повні, неповні, без даних). */
export type BasketComparison = {
  itemCount: number;
  verdict: BasketVerdict;
  stores: ComparisonResult[];
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
  lastSeenAt?: string;
  promoEndsAt?: string | null;
  label: string;
};

export type MarketPrice = Price & {
  product: Product;
  matchType: "exact" | "similar";
};
