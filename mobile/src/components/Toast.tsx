import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, radii, spacing, type } from "../utils/theme";
import { Icon } from "./Icon";

type ToastOptions = {
  kind?: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
};

type ToastState = ToastOptions & { id: number; message: string };

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

/** Замінює Alert.alert, який у вебверсії нічого не показує. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counter = useRef(0);
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    counter.current += 1;
    setToast({ ...options, message, id: counter.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.actionLabel ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => show, [show]);
  const isError = toast?.kind === "error";

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
        {toast ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.toast, isError && styles.toastError]}>
            <Icon name={isError ? "alert" : "check"} size={18} color={colors.onPrimary} />
            <Text style={styles.message}>{toast.message}</Text>
            {toast.actionLabel ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                style={styles.action}
              >
                <Text style={styles.actionText}>{toast.actionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
    maxWidth: 480,
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.text
  },
  toastError: { backgroundColor: colors.danger },
  message: { ...type.small, flex: 1, color: colors.onPrimary, fontWeight: "500" },
  action: { minHeight: layout.minTouch, justifyContent: "center", paddingLeft: spacing.sm },
  actionText: { ...type.small, color: colors.onPrimary, fontWeight: "700", textDecorationLine: "underline" }
});
