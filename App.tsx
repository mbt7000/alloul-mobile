import "react-native-gesture-handler";
import React from "react";
import { StatusBar, ActivityIndicator, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { I18nextProvider } from "react-i18next";
import i18n from "./src/i18n";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import { CompanyProvider } from "./src/lib/CompanyContext";
import AppNavigator from "./src/navigation/AppNavigator";
import LoginScreen from "./src/screens/auth/LoginScreen";
import LanguageSync from "./src/components/LanguageSync";
import { colors } from "./src/theme/colors";

const DarkTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgSurface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
    notification: colors.accentRose,
  },
};

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accentCyan} />
      </View>
    );
  }

  return user ? <AppNavigator /> : <LoginScreen />;
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LanguageSync />
          <NavigationContainer theme={DarkTheme}>
            <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
            <AuthProvider>
              <CompanyProvider>
                <RootNavigator />
              </CompanyProvider>
            </AuthProvider>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}
