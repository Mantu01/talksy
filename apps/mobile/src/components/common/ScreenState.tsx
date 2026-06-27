import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

interface ScreenStateProps {
  loading?: boolean;
  title?: string;
}

export function ScreenState({ loading, title }: ScreenStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Text variant="bodyLarge" style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
          {title}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  text: {
    textAlign: "center",
  },
});
