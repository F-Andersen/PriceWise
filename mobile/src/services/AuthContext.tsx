import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken, setUnauthorizedHandler } from "./api";

type AuthContextValue = {
  token: string | null;
  email: string | null;
  isReady: boolean;
  /** True after the server rejected the saved session; shown on the login screen. */
  sessionExpired: boolean;
  signIn: (email: string, password: string, mode: "login" | "register") => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAuthToken(null);
      setToken(null);
      setSessionExpired(true);
      AsyncStorage.multiRemove(["token", "activeListId"]).catch(() => undefined);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    AsyncStorage.multiGet(["token", "email"]).then((values) => {
      const savedToken = values[0][1];
      setToken(savedToken);
      setAuthToken(savedToken);
      setEmail(values[1][1]);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      email,
      isReady,
      sessionExpired,
      signIn: async (nextEmail, password, mode) => {
        const result = mode === "login" ? await api.login(nextEmail, password) : await api.register(nextEmail, password);
        setToken(result.token);
        setAuthToken(result.token);
        setSessionExpired(false);
        setEmail(result.user.email);
        await AsyncStorage.multiSet([
          ["token", result.token],
          ["email", result.user.email]
        ]);
      },
      signOut: async () => {
        setToken(null);
        setEmail(null);
        setAuthToken(null);
        await AsyncStorage.multiRemove(["token", "email", "activeListId"]);
      }
    }),
    [email, isReady, sessionExpired, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
