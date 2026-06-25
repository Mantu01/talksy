import React from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Appbar, TextInput, IconButton, Avatar, Text, useTheme, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { socketService } from "@/utils/socket";
import { useLocalState } from "@/hooks/use-local-state";

export default function GroupChatScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [text, setText] = useLocalState(`group-input-${id}`, "");

  const { data: currentUser } = useQuery<any>({
    queryKey: ["auth-user"],
    queryFn: () => apiRequest("/auth/me").catch(() => null),
  });

  const { data: groups } = useQuery<any[]>({
    queryKey: ["joined-groups"],
    queryFn: () => apiRequest("/groups/joined"),
  });

  const group = groups?.find((g) => g._id === id);

  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: ["group-messages", id],
    queryFn: () => apiRequest(`/chats/group-messages/${id}`),
  });

  const handleSend = () => {
    if (!text.trim()) return;
    socketService.sendMessage(null, id, text.trim());
    setText("");
  };

  const reversedMessages = messages ? [...messages].reverse() : [];

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender._id === currentUser?.id || item.sender === currentUser?.id || item.sender._id === currentUser?._id;
    const senderName = item.sender?.name || "Unknown";
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.theirMessageRow]}>
        <View
          style={[
            styles.bubble,
            isMe
              ? [styles.myBubble, { backgroundColor: theme.colors.primary }]
              : [styles.theirBubble, { backgroundColor: theme.colors.surfaceVariant }],
          ]}
        >
          {!isMe ? (
            <Text variant="labelSmall" style={[styles.senderName, { color: theme.colors.primary }]}>
              {senderName}
            </Text>
          ) : null}
          <Text
            variant="bodyMedium"
            style={{ color: isMe ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}
          >
            {item.text}
          </Text>
          <Text
            variant="bodySmall"
            style={[
              styles.time,
              { color: isMe ? theme.colors.onPrimary : theme.colors.onSurfaceVariant, opacity: 0.6 },
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  const headerTitle = group?.title || "Group Chat";
  const headerAvatar = group?.logo;
  const initial = headerTitle.charAt(0).toUpperCase();
  const membersCount = group?.members?.length || 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        {headerAvatar ? (
          <Avatar.Image size={36} source={{ uri: headerAvatar }} style={styles.headerAvatar} />
        ) : (
          <Avatar.Text size={36} label={initial} style={styles.headerAvatar} />
        )}
        <Appbar.Content title={headerTitle} subtitle={`${membersCount} members`} />
      </Appbar.Header>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.listContent}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
            mode="flat"
            dense
            multiline
            style={styles.input}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
          <IconButton
            icon="send"
            mode="contained"
            containerColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            size={24}
            onPress={handleSend}
            disabled={!text.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatar: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    width: "100%",
  },
  myMessageRow: {
    justifyContent: "flex-end",
  },
  theirMessageRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 2,
  },
  myBubble: {
    borderBottomRightRadius: 2,
  },
  theirBubble: {
    borderBottomLeftRadius: 2,
  },
  senderName: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  time: {
    alignSelf: "flex-end",
    fontSize: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "transparent",
  },
});
