import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "../components/Icon";
import { useAuth } from "../services/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { CompareStoresScreen } from "../screens/CompareStoresScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { OffersScreen } from "../screens/OffersScreen";
import { ProductDetailsScreen } from "../screens/ProductDetailsScreen";
import { ProductSearchScreen } from "../screens/ProductSearchScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecipeDetailsScreen } from "../screens/RecipeDetailsScreen";
import { RecipesScreen } from "../screens/RecipesScreen";
import { ShoppingListScreen } from "../screens/ShoppingListScreen";
import { colors, layout, spacing, type } from "../utils/theme";

export type RootStackParamList = {
  Tabs: undefined;
  ProductDetails: { productId: string };
  RecipeDetails: { recipeId: string };
  CompareStores: { listId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const tabIcons: Record<string, IconName> = {
  Home: "home",
  Offers: "tag",
  Search: "search",
  Cart: "basket",
  Recipes: "book",
  Profile: "user"
};

function HeaderBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Назад"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
    >
      <Icon name="chevronLeft" size={22} />
    </Pressable>
  );
}

function PriceWiseTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View accessibilityRole="tablist" style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const title = descriptors[route.key].options.title ?? route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={title}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.tabItem}
            >
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Icon name={tabIcons[route.name]} size={21} color={focused ? colors.primaryDark : colors.muted} strokeWidth={focused ? 2.1 : 1.7} />
              </View>
              <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>{title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator backBehavior="history" tabBar={(props) => <PriceWiseTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Головна" }} />
      <Tab.Screen name="Offers" component={OffersScreen} options={{ title: "Акції" }} />
      <Tab.Screen name="Search" component={ProductSearchScreen} options={{ title: "Пошук" }} />
      <Tab.Screen name="Cart" component={ShoppingListScreen} options={{ title: "Кошик" }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: "Меню" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Профіль" }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { token, isReady } = useAuth();
  if (!isReady) return null;
  if (!token) return <AuthScreen />;

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600", fontSize: 17 },
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: () => (navigation.canGoBack() ? <HeaderBackButton onPress={navigation.goBack} /> : null),
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: colors.background }
      })}
    >
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false, title: "PriceWise" }} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: "Картка товару" }} />
      <Stack.Screen name="RecipeDetails" component={RecipeDetailsScreen} options={{ title: "Рецепт" }} />
      <Stack.Screen name="CompareStores" component={CompareStoresScreen} options={{ title: "Порівняння магазинів" }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  backButton: { width: layout.minTouch, height: layout.minTouch, alignItems: "center", justifyContent: "center", marginRight: spacing.xs },
  tabBar: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs },
  tabRow: { flexDirection: "row", width: "100%", maxWidth: layout.maxContent, alignSelf: "center" },
  tabItem: { flex: 1, minWidth: 0, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 2 },
  tabIcon: { width: 44, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  tabIconActive: { backgroundColor: colors.primarySoft },
  tabLabel: { ...type.label, fontSize: 11, fontWeight: "500" },
  tabLabelActive: { color: colors.primaryDark, fontWeight: "700" }
});
