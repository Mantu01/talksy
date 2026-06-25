import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider } from "@react-navigation/native";
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from "react-native-paper";
import merge from "deepmerge";
import { customThemeColor } from "@/utils/colors";
import { useColorScheme } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { socketService } from "@/utils/socket";

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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? combineDarkTheme : combineLightTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <ThemeProvider value={theme}>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}