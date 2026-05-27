import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
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
import { colors } from "../utils/theme";

export type RootStackParamList = {
  Tabs: undefined;
  ProductDetails: { productId: string };
  RecipeDetails: { recipeId: string };
  CompareStores: { listId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type TabIconProps = {
  focused: boolean;
  color: string;
  symbol: string;
};

function TabIcon({ focused, color, symbol }: TabIconProps) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.iconText, { color: focused ? colors.primary : color }]}>{symbol}</Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "900" },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#98A7A0",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800", marginTop: 2 },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Головна", tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} symbol="⌂" /> }} />
      <Tab.Screen name="Offers" component={OffersScreen} options={{ title: "Акції", tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} symbol="%" /> }} />
      <Tab.Screen name="Search" component={ProductSearchScreen} options={{ title: "Пошук", tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} symbol="⌕" /> }} />
      <Tab.Screen name="Cart" component={ShoppingListScreen} options={{ title: "Кошик", tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} symbol="▣" /> }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: "Меню", tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} symbol="☰" /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Профіль", tabBarIcon: ({ focused, color }) => <TabIcon focused={focused} color={color} symbol="○" /> }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { token, isReady } = useAuth();
  if (!isReady) return null;
  if (!token) return <AuthScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: "900" } }}>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{ title: "Картка товару" }} />
      <Stack.Screen name="RecipeDetails" component={RecipeDetailsScreen} options={{ title: "Рецепт" }} />
      <Stack.Screen name="CompareStores" component={CompareStoresScreen} options={{ title: "Порівняння магазинів" }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingTop: 8,
    paddingBottom: 9,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12
  },
  tabItem: {
    paddingVertical: 2
  },
  iconWrap: {
    minWidth: 34,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrapActive: {
    backgroundColor: colors.primarySoft
  },
  iconText: {
    fontSize: 18,
    fontWeight: "900"
  }
});
