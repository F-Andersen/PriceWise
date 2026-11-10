import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { api } from "../services/api";
import { useStores } from "../services/StoresContext";
import { Store } from "../types";
import { countLabel } from "../utils/prices";
import { colors, layout, spacing, type } from "../utils/theme";
import { Card, ErrorState, Notice, SectionHeader } from "./ui";

/** Вибір магазинів, між якими застосунок порівнює ціни. Хоча б один лишається увімкненим. */
export function StorePicker() {
  const { isExcluded, setStoreEnabled } = useStores();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api.allStores().then(setStores).catch(() => setFailed(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (failed) return <ErrorState onRetry={load} />;
  if (!stores) return null;

  const enabledCount = stores.filter((store) => !isExcluded(store.id)).length;

  return (
    <View style={styles.section}>
      <SectionHeader title="Мої магазини" subtitle={`Ціни й порівняння: ${countLabel(enabledCount, "магазин", "магазини", "магазинів")} із ${stores.length}`} />
      <Card style={styles.card}>
        {stores.map((store, index) => {
          const enabled = !isExcluded(store.id);
          const isLast = enabled && enabledCount === 1;
          return (
            <View key={store.id} style={[styles.row, index > 0 && styles.divider]}>
              <Text style={[type.bodyStrong, styles.name]}>{store.name}</Text>
              <Switch
                accessibilityLabel={`Враховувати магазин ${store.name}`}
                accessibilityHint={isLast ? "Хоча б один магазин має лишатися увімкненим" : undefined}
                value={enabled}
                disabled={isLast}
                onValueChange={(next) => setStoreEnabled(store.id, next)}
                trackColor={{ false: colors.borderStrong, true: colors.primary }}
                thumbColor={colors.onPrimary}
                {...({ activeThumbColor: colors.onPrimary } as object)}
              />
            </View>
          );
        })}
      </Card>
      <Notice tone="neutral" icon="info" text="Вимкніть мережі, яких немає у вашому місті. Ціни взяті із сайтів мереж без вибору адреси, тому у вашому магазині ціна й наявність можуть відрізнятися." />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg, gap: spacing.sm },
  card: { paddingVertical: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: layout.minTouch + 8, gap: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  name: { flex: 1 }
});
