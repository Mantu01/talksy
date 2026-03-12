import '@/global.css';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { NAV_THEME } from '@/lib/theme';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button
      onPressIn={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full web:mx-4"
    >
      <Icon as={THEME_ICONS[colorScheme || 'light']} className="size-5" />
    </Button>
  );
}

const TABS = [
  { name: 'index', title: 'Home' },
  { name: 'login', title: 'Login' },
  { name: 'signup', title: 'Signup' },
  {name:'chat',tile:'Chat'}
];

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <ThemeProvider value={NAV_THEME[colorScheme || 'light']}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerTransparent: true,
          headerRight: () => <ThemeToggle />,
          headerTitleAlign: 'center',
        }}
      >
        {TABS.map(({ name, title }) => (
          <Stack.Screen key={name} name={name} options={{ headerTitle:title }} />
        ))}
      </Stack>

      <PortalHost />
    </ThemeProvider>
  );
}