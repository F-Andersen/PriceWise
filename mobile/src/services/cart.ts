import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, SessionExpiredError } from "./api";

const ACTIVE_LIST_KEY = "activeListId";

/**
 * Додає товар в активний кошик. Новий кошик створюється лише тоді,
 * коли в користувача ще немає жодного або збережений більше не існує.
 */
export async function addToActiveList(productId: string, quantity = 1) {
  let listId = await AsyncStorage.getItem(ACTIVE_LIST_KEY);
  if (!listId) {
    const lists = await api.lists();
    listId = lists[0]?.id ?? (await api.createList("Мій кошик")).id;
    await AsyncStorage.setItem(ACTIVE_LIST_KEY, listId);
  }
  try {
    await api.addItem(listId, productId, quantity);
  } catch (error) {
    if (error instanceof SessionExpiredError) throw error;
    const list = await api.createList("Мій кошик");
    await AsyncStorage.setItem(ACTIVE_LIST_KEY, list.id);
    await api.addItem(list.id, productId, quantity);
  }
}
