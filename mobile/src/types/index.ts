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

/** Сторінка каталогу. categories рахуються без урахування вибраної категорії. */
export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  categories: Array<{ name: string; count: number }>;
};

export type CatalogSummary = {
  total: number;
  latestCheckedAt: string | null;
  storesWithPrices: number;
  cheapest: Product[];
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
  /** unavailable — магазин позначив «немає в наявності»; no_price — у базі немає ціни; stale — ціну давно не підтверджено. */
  reason: "unavailable" | "no_price" | "stale";
  checkedAt?: string;
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
  /** Скільки пар «магазин — товар» не враховано, бо ціну давно не підтверджено. */
  staleCount: number;
};

export type Recommendation = {
  type: "alternative" | "discount" | "below_average";
  message: string;
  product?: Product;
  alternative?: Product;
  store?: Store;
  /** alternative: на скільки дешевше за одиницю, одиниця та ціни за неї. */
  savingPercent?: number;
  unit?: "кг" | "л" | "шт";
  unitPrice?: number;
  targetUnitPrice?: number;
  /** discount / below_average */
  price?: number;
  oldPrice?: number;
  discountPercent?: number;
  promoEndsAt?: string | null;
  average?: number;
  belowPercent?: number;
};

/** Дешевший товар того самого виду; ціни порівнюються за кг, л або шт. */
export type Alternative = {
  product: Product;
  store: Store;
  packPrice: number;
  unitPrice: number;
  unit: "кг" | "л" | "шт";
  targetUnitPrice: number;
  savingPercent: number;
};

export type RecipeItem = {
  id: string;
  name: string;
  amount: number;
  unit: string;
  optional: boolean;
  /** Скільки упаковок покласти в кошик. */
  quantity: number;
  lowestPrice: number | null;
  dishCost: number | null;
  purchaseCost: number | null;
  product: Product | null;
};

export type Recipe = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  guide: {
    durationMinutes: number;
    servings: number;
    difficulty: string;
    steps: string[];
  };
  items: RecipeItem[];
  cost: { dish: number; purchase: number; unpriced: number };
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

/** Сторінка акцій. stores і latestCheckedAt рахуються по всіх магазинах, а не лише по вибраному. */
export type OfferPage = {
  items: Offer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  stores: Array<{ storeId: string; count: number }>;
  latestCheckedAt: string | null;
};

export type PlanItem = { productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number; hasDiscount: boolean };

export type BasketPlan = {
  storeCount: number;
  stops: Array<{ store: Store; items: PlanItem[]; total: number }>;
  total: number;
  coveredCount: number;
  missing: Array<{ productId: string; productName: string }>;
  /** Економія проти одного магазину; null, якщо той купує менше товарів. */
  savingVsOneStore: number | null;
  isRecommended: boolean;
  explanation: string[];
};

export type BasketPlanResult = {
  itemCount: number;
  extraStoreCost: number;
  plans: BasketPlan[];
  summary: string | null;
};

export type PriceSignal = "good" | "normal" | "high" | "insufficient";

export type StoreAnalysis = {
  store: { id: string; name: string };
  current: number;
  hasDiscount: boolean;
  observedDays: number;
  changes: number;
  min: number;
  max: number;
  average: number;
  promoShare: number;
  cheaperThanShare: number;
  signal: PriceSignal;
};

export type ProductAnalysis = {
  signal: PriceSignal;
  reference: StoreAnalysis | null;
  stores: StoreAnalysis[];
  windowDays: number;
  minObservedDays: number;
  reasons: string[];
};

export type MarketPrice = Price & {
  product: Product;
  matchType: "exact" | "similar";
};
