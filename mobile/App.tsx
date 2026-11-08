import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "./src/components/Toast";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/services/AuthContext";
import { StoresProvider } from "./src/services/StoresContext";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StoresProvider>
        <ToastProvider>
          <NavigationContainer documentTitle={{ formatter: (options) => (options?.title && options.title !== "PriceWise" ? `${options.title} · PriceWise` : "PriceWise") }}>
            <AppNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
        </ToastProvider>
        </StoresProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
