import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { getImageUrl } from "../../utils/api";

interface SafeBannerProps {
  uri?: string;
  placeholderText?: string;
  style?: StyleProp<ViewStyle>;
}

export const SafeBanner: React.FC<SafeBannerProps> = ({
  uri,
  placeholderText = "No Banner Set",
  style,
}) => {
  const theme = useTheme();
  const imageUrl = getImageUrl(uri);

  if (imageUrl) {
    return <Card.Cover source={{ uri: imageUrl }} style={[styles.banner, style]} />;
  }

  return (
    <View style={[styles.bannerPlaceholder, { backgroundColor: theme.colors.primaryContainer }, style]}>
      <Text variant="bodyLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: "500" }}>
        {placeholderText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    height: 140,
    borderRadius: 0,
  },
  bannerPlaceholder: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
});
