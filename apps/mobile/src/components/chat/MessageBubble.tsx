import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { SafeAvatar } from "../common/SafeAvatar";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface MessageBubbleProps {
  text: string;
  createdAt: string | Date;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string;
  showAvatar?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  createdAt,
  isMe,
  senderName,
  senderAvatar,
  showAvatar = false,
}) => {
  const theme = useTheme();
  const timeStr = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
      {!isMe && showAvatar && (
        <View style={styles.avatarContainer}>
          <SafeAvatar uri={senderAvatar} name={senderName || "U"} size={32} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isMe
            ? [styles.myBubble, { backgroundColor: theme.colors.primary }]
            : [styles.theirBubble, { backgroundColor: theme.colors.elevation.level2, borderColor: theme.colors.outlineVariant, borderWidth: 1 }],
        ]}
      >
        {!isMe && senderName ? (
          <Text variant="labelSmall" style={[styles.senderName, { color: theme.colors.secondary, fontWeight: "700" }]}>
            {senderName}
          </Text>
        ) : null}
        
        <Text
          variant="bodyMedium"
          style={{
            color: isMe ? theme.colors.onPrimary : theme.colors.onSurface,
            lineHeight: 20,
            fontSize: 15,
          }}
        >
          {text}
        </Text>
        
        <View style={styles.footerRow}>
          <Text
            style={[
              styles.time,
              { color: isMe ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, opacity: 0.7 },
            ]}
          >
            {timeStr}
          </Text>
          {isMe ? (
            <MaterialCommunityIcons
              name="check-all"
              size={14}
              color={theme.colors.onPrimary}
              style={styles.checkIcon}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    width: "100%",
    marginVertical: 3,
  },
  myMessageRow: {
    justifyContent: "flex-end",
  },
  theirMessageRow: {
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    marginBottom: 4,
    fontSize: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignSelf: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  time: {
    fontSize: 9.5,
  },
  checkIcon: {
    marginLeft: 4,
    opacity: 0.8,
  },
});
