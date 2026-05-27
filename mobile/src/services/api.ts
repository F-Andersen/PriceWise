import { ComparisonResult, Offer, Product, Recipe, ShoppingList, Store } from "../types";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001/api").trim();

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
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
  products: () => request<Product[]>("/products"),
  searchProducts: (query: string) => request<Product[]>(`/products/search?query=${encodeURIComponent(query)}`),
  product: (id: string) => request<Product>(`/products/${id}`),
  alternatives: (id: string) => request<any[]>(`/products/${id}/alternatives`),
  stores: () => request<Store[]>("/stores"),
  offers: (storeId?: string) => request<Offer[]>(`/offers${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ""}`),
  lists: () => request<ShoppingList[]>("/shopping-lists"),
  createList: (title: string) => request<ShoppingList>("/shopping-lists", { method: "POST", body: JSON.stringify({ title }) }),
  list: (id: string) => request<ShoppingList>(`/shopping-lists/${id}`),
  addItem: (listId: string, productId: string, quantity = 1) => request(`/shopping-lists/${listId}/items`, { method: "POST", body: JSON.stringify({ productId, quantity }) }),
  updateItem: (listId: string, itemId: string, quantity: number) => request(`/shopping-lists/${listId}/items/${itemId}`, { method: "PUT", body: JSON.stringify({ quantity }) }),
  deleteItem: (listId: string, itemId: string) => request(`/shopping-lists/${listId}/items/${itemId}`, { method: "DELETE" }),
  compare: (listId: string) => request<ComparisonResult[]>(`/shopping-lists/${listId}/compare`),
  recommendations: (listId: string) => request<any[]>(`/shopping-lists/${listId}/recommendations`),
  recipes: () => request<Recipe[]>("/recipes"),
  recipe: (id: string) => request<Recipe>(`/recipes/${id}`),
  addRecipeToList: (recipeId: string, shoppingListId?: string) => request<ShoppingList>(`/recipes/${recipeId}/add-to-shopping-list`, { method: "POST", body: JSON.stringify({ shoppingListId }) })
};
