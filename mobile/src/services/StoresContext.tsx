import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setExcludedStores } from "./api";

const STORAGE_KEY = "excludedStores";

type StoresContextValue = {
  /** Магазини, які користувач вимкнув. Нові мережі увімкнені за замовчуванням. */
  excludedStoreIds: string[];
  isExcluded: (storeId: string) => boolean;
  setStoreEnabled: (storeId: string, enabled: boolean) => Promise<void>;
};

const StoresContext = createContext<StoresContextValue | undefined>(undefined);

export function StoresProvider({ children }: PropsWithChildren) {
  const [excludedStoreIds, setExcluded] = useState<string[]>([]);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        const ids: string[] = saved ? JSON.parse(saved) : [];
        setExcludedStores(ids);
        setExcluded(ids);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setStoreEnabled = useCallback(async (storeId: string, enabled: boolean) => {
    const next = enabled ? excludedStoreIds.filter((id) => id !== storeId) : [...new Set([...excludedStoreIds, storeId])];
    setExcludedStores(next);
    setExcluded(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [excludedStoreIds]);

  const value = useMemo<StoresContextValue>(
    () => ({ excludedStoreIds, isExcluded: (storeId) => excludedStoreIds.includes(storeId), setStoreEnabled }),
    [excludedStoreIds, setStoreEnabled]
  );

  // Запити екранів мають одразу йти з вибором користувача, тому чекаємо на його читання.
  if (!isReady) return null;
  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>;
}

export function useStores() {
  const value = useContext(StoresContext);
  if (!value) throw new Error("useStores must be used inside StoresProvider");
  return value;
}
