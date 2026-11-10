import { BottomTabBarProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "../components/Icon";
import { useAuth } from "../services/AuthContext";
import { AuthScreen } from "../screens/AuthScreen";
import { ChangePasswordScreen } from "../screens/ChangePasswordScreen";
import { CompareStoresScreen } from "../screens/CompareStoresScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { OffersScreen } from "../screens/OffersScreen";
import { ProductDetailsScreen } from "../screens/ProductDetailsScreen";
import { ProductSearchScreen } from "../screens/ProductSearchScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecipeDetailsScreen } from "../screens/RecipeDetailsScreen";
import { RecipesScreen } from "../screens/RecipesScreen";
import { ShoppingListScreen } from "../screens/ShoppingListScreen";
import { colors, layout, spacing, type, fonts } from "../utils/theme";

export type RootStackParamList = {
  Tabs: { screen: string } | undefined;
  ProductDetails: { productId: string };
  RecipeDetails: { recipeId: string };
  ChangePassword: undefined; CompareStores: { listId: string };
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
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
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
              <View style={styles.tabIcon}>
                <Icon name={tabIcons[route.name]} size={22} color={focused ? colors.text : colors.muted} strokeWidth={focused ? 2.3 : 1.7} />
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

function AuthModal() {
  const { authPrompt, closeAuth } = useAuth();
  return (
    <Modal visible={authPrompt !== null} animationType="slide" onRequestClose={closeAuth}>
      <AuthScreen />
    </Modal>
  );
}

export function AppNavigator() {
  const { isReady } = useAuth();
  if (!isReady) return null;

  return (
    <>
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17 },
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
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Зміна пароля" }} />
    </Stack.Navigator>
    <AuthModal />
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  backButton: { width: layout.minTouch, height: layout.minTouch, alignItems: "center", justifyContent: "center", marginRight: spacing.xs },
  tabBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: spacing.xs, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tabRow: { flexDirection: "row", width: "100%", maxWidth: 560, alignSelf: "center" },
  tabItem: { flex: 1, minWidth: 0, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  tabIcon: { height: 26, alignItems: "center", justifyContent: "center" },
  tabLabel: { ...type.label, fontSize: 11, lineHeight: 14, color: colors.muted, fontFamily: fonts.medium },
  tabLabelActive: { color: colors.text, fontFamily: fonts.bold }
});
