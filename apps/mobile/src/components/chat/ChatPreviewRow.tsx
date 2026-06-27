import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text, Surface, useTheme } from "react-native-paper";
import { SafeAvatar } from "../common/SafeAvatar";
import { ChatListItem } from "@/types/domain";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ChatPreviewRowProps {
  item: ChatListItem;
  onPress: () => void;
}

export function ChatPreviewRow({ item, onPress }: ChatPreviewRowProps) {
  const theme = useTheme();

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const hasMessage = !!item.lastMessage;
  const timeText = formatTime(item.lastMessageAt);

  const renderSubtitle = () => {
    if (hasMessage) {
      const senderText = item.lastMessageSender ? `${item.lastMessageSender}: ` : "";
      return (
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}
        >
          {item.kind === "group" ? senderText : ""}{item.lastMessage}
        </Text>
      );
    }
    return (
      <Text
        variant="bodyMedium"
        numberOfLines={1}
        style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7, fontSize: 13, fontStyle: "italic" }}
      >
        {item.subtitle || "No messages yet"}
      </Text>
    );
  };

  return (
    <Surface
      style={[
        styles.surface,
        {
          backgroundColor: theme.colors.elevation.level1,
          borderColor: theme.colors.outlineVariant,
        }
      ]}
      elevation={1}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{ color: theme.colors.primaryContainer }}
        style={styles.container}
      >
        <SafeAvatar uri={item.imageUri} name={item.title} size={50} style={styles.avatar} />
        
        <View style={styles.content}>
          <View style={styles.row}>
            <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {item.title}
            </Text>
            {timeText ? (
              <Text variant="labelSmall" style={{ color: theme.colors.outline, fontSize: 11 }}>
                {timeText}
              </Text>
            ) : null}
          </View>
          
          <View style={styles.row}>
            <View style={styles.subtitleWrapper}>
              {renderSubtitle()}
            </View>
            <View style={styles.badgeWrapper}>
              <MaterialCommunityIcons
                name={item.kind === "group" ? "account-group" : "message-text-outline"}
                size={16}
                color={theme.colors.outline}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 16,
    overflow: "hidden",
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
  },
  container: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  avatar: {
    marginRight: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 1,
  },
  title: {
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  subtitleWrapper: {
    flex: 1,
    marginRight: 8,
  },
  badgeWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
});
