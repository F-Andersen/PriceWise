import { NativeModules, Platform } from "react-native";
import { Alternative, BasketComparison, MarketPrice, Recommendation, Offer, Product, Recipe, ShoppingList, Store } from "../types";

const FALLBACK_LAN_HOST = "192.168.0.221";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getHostFromLocation() {
  const location = (globalThis as { location?: { hostname?: string } }).location;
  return location?.hostname;
}

function getHostFromNativeBundle() {
  const sourceCode = NativeModules.SourceCode as { scriptURL?: string } | undefined;
  const scriptUrl = sourceCode?.scriptURL;
  if (!scriptUrl) return undefined;

  try {
    return new URL(scriptUrl).hostname;
  } catch {
    const match = scriptUrl.match(/^(?:https?|exp):\/\/([^/:]+)/i);
    return match?.[1];
  }
}

function inferApiUrl() {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitUrl) return trimTrailingSlash(explicitUrl);

  if (Platform.OS === "web") {
    const host = getHostFromLocation() || "localhost";
    return `http://${host}:4001/api`;
  }

  const nativeHost = getHostFromNativeBundle();
  const host = nativeHost && !["localhost", "127.0.0.1", "::1"].includes(nativeHost) ? nativeHost : FALLBACK_LAN_HOST;
  return `http://${host}:4001/api`;
}

const API_URL = inferApiUrl();

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

let excludedStores: string[] = [];

/** Магазини, вимкнені користувачем: сервер не враховує їх у цінах і порівнянні. */
export function setExcludedStores(storeIds: string[]) {
  excludedStores = storeIds;
}

function withStores(path: string) {
  if (!excludedStores.length) return path;
  return `${path}${path.includes("?") ? "&" : "?"}excludeStores=${encodeURIComponent(excludedStores.join(","))}`;
}

let onUnauthorized: (() => void) | null = null;

/** Called when the server rejects our token (expired, or signed with another key). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 401 && authToken && !path.startsWith("/auth/")) {
    // The saved session is no longer valid: drop it so the app shows the login screen
    // instead of screens that silently fail.
    onUnauthorized?.();
    throw new Error("Сесія завершилась. Увійдіть знову.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "API request failed" }));
    throw new Error(error.message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  register: (email: string, password: string) => request<{ token: string; user: { id: string; email: string } }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request<{ token: string; user: { id: string; email: string } }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  products: () => request<Product[]>(withStores("/products")),
  searchProducts: (query: string) => request<Product[]>(withStores(`/products/search?query=${encodeURIComponent(query)}`)),
  product: (id: string) => request<Product>(withStores(`/products/${id}`)),
  marketPrices: (id: string) => request<MarketPrice[]>(withStores(`/products/${id}/market-prices`)),
  alternatives: (id: string) => request<Alternative[]>(withStores(`/products/${id}/alternatives`)),
  stores: () => request<Store[]>(withStores("/stores")),
  /** Усі мережі, зокрема вимкнені: для екрана вибору. */
  allStores: () => request<Store[]>("/stores"),
  offers: (storeId?: string) => request<Offer[]>(withStores(`/offers${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""}`)),
  lists: () => request<ShoppingList[]>("/shopping-lists"),
  createList: (title: string) => request<ShoppingList>("/shopping-lists", { method: "POST", body: JSON.stringify({ title }) }),
  list: (id: string) => request<ShoppingList>(withStores(`/shopping-lists/${id}`)),
  addItem: (listId: string, productId: string, quantity = 1) => request(`/shopping-lists/${listId}/items`, { method: "POST", body: JSON.stringify({ productId, quantity }) }),
  updateItem: (listId: string, itemId: string, quantity: number) => request(`/shopping-lists/${listId}/items/${itemId}`, { method: "PUT", body: JSON.stringify({ quantity }) }),
  deleteItem: (listId: string, itemId: string) => request(`/shopping-lists/${listId}/items/${itemId}`, { method: "DELETE" }),
  compare: (listId: string) => request<BasketComparison>(withStores(`/shopping-lists/${listId}/compare`)),
  recommendations: (listId: string) => request<Recommendation[]>(withStores(`/shopping-lists/${listId}/recommendations`)),
  recipes: () => request<Recipe[]>("/recipes"),
  recipe: (id: string) => request<Recipe>(`/recipes/${id}`),
  addRecipeToList: (recipeId: string, shoppingListId?: string) => request<ShoppingList>(`/recipes/${recipeId}/add-to-shopping-list`, { method: "POST", body: JSON.stringify({ shoppingListId }) })
};
