import React from "react";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { List, Surface, useTheme, Text } from "react-native-paper";
import { SafeAvatar } from "../common/SafeAvatar";

interface ActionListRowProps {
  title: string;
  description?: string;
  imageUri?: string;
  action: ReactNode;
  meta?: string;
}

export function ActionListRow({ title, description, imageUri, action, meta }: ActionListRowProps) {
  const theme = useTheme();

  return (
    <Surface style={[styles.surface, { backgroundColor: theme.colors.elevation.level1 }]} elevation={1}>
      <List.Item
        title={title}
        description={description}
        left={(props) => <SafeAvatar uri={imageUri} name={title} size={50} style={props.style} />}
        right={() => (
          <View style={styles.rightContainer}>
            {meta ? (
              <Text style={[styles.metaText, { color: theme.colors.outline }]}>
                {meta}
              </Text>
            ) : null}
            <View style={styles.action}>{action}</View>
          </View>
        )}
        style={styles.item}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 14,
    marginVertical: 6,
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    marginRight: 4,
  },
  action: {
    justifyContent: "center",
    marginLeft: 8,
  },
});
