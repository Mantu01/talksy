import React, { useState, useEffect } from "react";
import { Stack, router } from "expo-router";
import { PaperProvider, useTheme, Surface, Text, IconButton, ActivityIndicator } from "react-native-paper";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider } from "@react-navigation/native";
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from "react-native-paper";
import merge from "deepmerge";
import { customThemeColor } from "@/utils/colors";
import { useColorScheme, StyleSheet, View, Pressable } from "react-native";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/utils/socket";
import { SafeAvatar } from "@/components/common/SafeAvatar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initToken } from "@/utils/api";

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const customLightTheme = { ...MD3LightTheme, colors: customThemeColor.light };
const customDarkTheme = { ...MD3DarkTheme, colors: customThemeColor.dark };

const combineLightTheme = merge(LightTheme, customLightTheme);
const combineDarkTheme = merge(DarkTheme, customDarkTheme);

const queryClient = new QueryClient();
socketService.init(queryClient);

function InAppNotificationToast() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: notification } = useQuery<any>({
    queryKey: ["in-app-notification"],
    queryFn: () => null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (!notification) return null;

  const handlePress = () => {
    if (notification.route) {
      router.push(notification.route);
    }
    queryClient.setQueryData(["in-app-notification"], null);
  };

  return (
    <View style={styles.toastContainer}>
      <Surface style={[styles.surface, { backgroundColor: theme.colors.elevation.level3, borderColor: theme.colors.outlineVariant }]} elevation={3}>
        <Pressable onPress={handlePress} style={styles.pressable}>
          <SafeAvatar uri={notification.avatar} name={notification.title || "N"} size={40} style={styles.avatar} />
          <View style={styles.content}>
            <Text variant="titleSmall" style={[styles.title, { color: theme.colors.primary }]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {notification.body}
            </Text>
          </View>
          <IconButton
            icon="close"
            size={18}
            onPress={() => queryClient.setQueryData(["in-app-notification"], null)}
            style={styles.closeBtn}
          />
        </Pressable>
      </Surface>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? combineDarkTheme : combineLightTheme;
  const [tokenLoaded, setTokenLoaded] = useState(false);

  useEffect(() => {
    initToken().then(() => {
      setTokenLoaded(true);
    });
  }, []);

  if (!tokenLoaded) {
    return (
      <PaperProvider theme={theme}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
          <ActivityIndicator size="large" />
        </View>
      </PaperProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <ThemeProvider value={theme}>
            <Stack screenOptions={{ headerShown: false }} />
            <InAppNotificationToast />
          </ThemeProvider>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 50,
    left: "5%",
    right: "5%",
    zIndex: 9999,
    width: "90%",
  },
  surface: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  pressable: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  closeBtn: {
    margin: 0,
  },
});