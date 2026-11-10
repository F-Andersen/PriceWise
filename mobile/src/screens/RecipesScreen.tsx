import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../components/Icon";
import { Badge, contentWidth, ErrorState, PageTitle, ProductImage, SkeletonList, StateView } from "../components/ui";
import { RootStackParamList } from "../navigation/AppNavigator";
import { api } from "../services/api";
import { Recipe } from "../types";
import { countLabel, formatPrice } from "../utils/prices";
import { colors, radii, shadow, spacing, type } from "../utils/theme";

export function RecipesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    api.recipes()
      .then((result) => {
        setRecipes(result);
        setStatus("ready");
      })
      .catch(() => setStatus((current) => (current === "ready" ? current : "error")));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      data={status === "ready" ? recipes : []}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={contentWidth}>
          <PageTitle title="Меню та рецепти" subtitle="Оберіть страву, додайте продукти в кошик і порівняйте магазини" />
          {status === "loading" ? <SkeletonList label="Завантаження рецептів" /> : null}
          {status === "error" ? <ErrorState onRetry={() => { setStatus("loading"); load(); }} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={contentWidth}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${item.title}, ${countLabel(item.items.length, "інгредієнт", "інгредієнти", "інгредієнтів")}, ${countLabel(item.guide.servings, "порція", "порції", "порцій")}${item.cost.dish ? `, приблизно ${formatPrice(item.cost.dish)}` : ""}`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => navigation.navigate("RecipeDetails", { recipeId: item.id })}
          >
            <ProductImage uri={item.imageUrl} size={88} />
            <View style={styles.body}>
              <Text style={type.heading} numberOfLines={2}>{item.title}</Text>
              <Text style={[type.small, styles.desc]} numberOfLines={2}>{item.description}</Text>
              <View style={styles.meta}>
                <Badge label={countLabel(item.items.length, "інгредієнт", "інгредієнти", "інгредієнтів")} />
                <Badge label={`${item.guide.durationMinutes} хв`} icon="clock" />
                {item.cost.dish ? <Badge label={`≈ ${formatPrice(item.cost.dish)} за ${countLabel(item.guide.servings, "порцію", "порції", "порцій")}`} tone="primary" /> : null}
              </View>
            </View>
            <Icon name="chevronRight" size={18} color={colors.muted} />
          </Pressable>
        </View>
      )}
      ListEmptyComponent={
        status === "ready" ? (
          <View style={contentWidth}>
            <StateView icon="book" title="Меню ще формується" text="Рецепти з'являться, коли в каталозі будуть усі потрібні продукти." />
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  pressed: { opacity: 0.75 },
  card: { ...shadow, flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  body: { flex: 1, minWidth: 0 },
  desc: { marginTop: 2 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm }
});
