import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, setAuthToken, setUnauthorizedHandler } from "./api";

type AuthResult = { token: string; user: { email: string } };
type PendingAction = () => void | Promise<void>;

type AuthContextValue = {
  token: string | null;
  email: string | null;
  isReady: boolean;
  /** True after the server rejected the saved session. */
  sessionExpired: boolean;
  /** Not null while the login window is open; `reason` says why it was asked for. */
  authPrompt: { reason: string | null } | null;
  /** Runs the action now if signed in; otherwise asks to sign in and runs it right after. */
  withAuth: (action: PendingAction, reason?: string) => Promise<void>;
  openAuth: () => void;
  closeAuth: () => void;
  signIn: (email: string, password: string, mode: "login" | "register") => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<AuthContextValue["authPrompt"]>(null);
  // The latest values for callbacks that outlive a render, such as a retry after an expired session.
  const tokenRef = useRef<string | null>(null);
  const pendingAction = useRef<PendingAction | null>(null);

  function applyToken(next: string | null) {
    tokenRef.current = next;
    setToken(next);
    setAuthToken(next);
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      applyToken(null);
      setSessionExpired(true);
      AsyncStorage.multiRemove(["token", "activeListId"]).catch(() => undefined);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    AsyncStorage.multiGet(["token", "email"]).then((values) => {
      applyToken(values[0][1]);
      setEmail(values[1][1]);
      setReady(true);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    async function finishSignIn(result: AuthResult) {
      applyToken(result.token);
      setSessionExpired(false);
      setEmail(result.user.email);
      await AsyncStorage.multiSet([
        ["token", result.token],
        ["email", result.user.email]
      ]);
      setAuthPrompt(null);
      const action = pendingAction.current;
      pendingAction.current = null;
      if (action) void action();
    }

    return {
      token,
      email,
      isReady,
      sessionExpired,
      authPrompt,
      withAuth: async (action, reason) => {
        if (tokenRef.current) {
          await action();
          return;
        }
        pendingAction.current = action;
        setAuthPrompt({ reason: reason ?? null });
      },
      openAuth: () => {
        pendingAction.current = null;
        setAuthPrompt({ reason: null });
      },
      closeAuth: () => {
        pendingAction.current = null;
        setAuthPrompt(null);
      },
      signIn: async (nextEmail, password, mode) => {
        await finishSignIn(mode === "login" ? await api.login(nextEmail, password) : await api.register(nextEmail, password));
      },
      resetPassword: async (nextEmail, code, password) => {
        await finishSignIn(await api.resetPassword(nextEmail, code, password));
      },
      changePassword: async (currentPassword, newPassword) => {
        const result = await api.changePassword(currentPassword, newPassword);
        applyToken(result.token);
        await AsyncStorage.setItem("token", result.token);
      },
      signOut: async () => {
        applyToken(null);
        setEmail(null);
        setSessionExpired(false);
        await AsyncStorage.multiRemove(["token", "email", "activeListId"]);
      }
    };
  }, [authPrompt, email, isReady, sessionExpired, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
