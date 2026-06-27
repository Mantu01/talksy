import React from "react";
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput } from "react-native";
import { Appbar, IconButton, useTheme, ActivityIndicator, Text } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { socketService } from "@/utils/socket";
import { useLocalState } from "@/hooks/use-local-state";
import { SafeAvatar } from "@/components/common/SafeAvatar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TalksyGroup, TalksyMessage, TalksyUser } from "@/types/domain";
import { getId } from "@/utils/ids";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GroupChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: socketStatus } = useQuery<"connected" | "disconnected">({
    queryKey: ["socket-status"],
    queryFn: () => "disconnected",
    staleTime: Infinity,
  });

  const { data: currentUser } = useQuery<TalksyUser | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      try {
        return await apiRequest<TalksyUser>("/auth/me");
      } catch {
        return null;
      }
    },
  });

  const currentUserId = getId(currentUser);
  const [text, setText] = useLocalState(["group-input", currentUserId, id], "");

  const { data: groups } = useQuery<TalksyGroup[]>({
    queryKey: ["joined-groups"],
    queryFn: () => apiRequest<TalksyGroup[]>("/groups/joined"),
  });

  const group = groups?.find((g) => g._id === id);

  const { data: messages, isLoading } = useQuery<TalksyMessage[]>({
    queryKey: ["group-messages", id],
    queryFn: () => apiRequest<TalksyMessage[]>(`/chats/group-messages/${id}`),
  });

  const handleSend = () => {
    if (!text.trim()) return;
    socketService.sendMessage(null, id, text.trim());
    setText("");
  };

  const handleHeaderPress = () => {
    router.push(`/group-chat/details/${id}`);
  };

  const reversedMessages = messages ? [...messages].reverse() : [];

  const renderMessage = ({ item }: { item: TalksyMessage }) => {
    const currentUserId = getId(currentUser);
    const senderId = getId(typeof item.sender === "string" ? item.sender : item.sender);
    const isMe = senderId === currentUserId;
    const senderName = typeof item.sender === "string" ? "" : item.sender.name;
    const senderAvatar = typeof item.sender === "string" ? undefined : item.sender.profile;

    return (
      <MessageBubble
        text={item.text}
        createdAt={item.createdAt}
        isMe={isMe}
        senderName={senderName}
        senderAvatar={senderAvatar}
        showAvatar={!isMe}
      />
    );
  };

  const headerTitle = group?.title || "Group Chat";
  const headerAvatar = group?.logo;
  const membersCount = group?.members?.length || 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header
        style={{
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
          elevation: 0,
        }}
      >
        <Appbar.BackAction onPress={() => router.back()} />
        <Pressable onPress={handleHeaderPress} style={styles.headerAvatarPressable}>
          <SafeAvatar uri={headerAvatar} name={headerTitle} size={36} style={styles.headerAvatar} />
        </Pressable>
        <Pressable onPress={handleHeaderPress} style={styles.headerTitlePressable}>
          <Appbar.Content title={headerTitle} subtitle={`${membersCount} members`} />
        </Pressable>
        <Appbar.Action icon="account-multiple-plus-outline" onPress={() => {}} iconColor={theme.colors.primary} />
        <Appbar.Action icon="information-outline" onPress={handleHeaderPress} iconColor={theme.colors.primary} />
      </Appbar.Header>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
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

        {socketStatus === "disconnected" ? (
          <View style={[styles.offlineBanner, { backgroundColor: theme.colors.errorContainer }]}>
            <Text style={{ color: theme.colors.onErrorContainer, fontSize: 12, textAlign: "center", fontWeight: "600" }}>
              Offline. Connecting to server...
            </Text>
          </View>
        ) : null}

        <View style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
            paddingBottom: Math.max(insets.bottom, 8),
          }
        ]}>
          <IconButton
            icon="plus"
            size={24}
            iconColor={theme.colors.primary}
            onPress={() => {}}
            style={styles.attachmentButton}
          />
          <View style={[styles.inputFrame, { backgroundColor: theme.colors.elevation.level1, borderColor: theme.colors.outlineVariant }]}>
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={text}
              onChangeText={setText}
              multiline
              style={[styles.input, { color: theme.colors.onSurface }]}
            />
          </View>
          <IconButton
            icon="send"
            mode="contained"
            containerColor={theme.colors.primary}
            iconColor={theme.colors.onPrimary}
            size={22}
            onPress={handleSend}
            disabled={!text.trim() || socketStatus === "disconnected"}
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
  offlineBanner: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarPressable: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatar: {
    marginRight: 8,
  },
  headerTitlePressable: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  attachmentButton: {
    margin: 0,
    marginRight: 4,
  },
  inputFrame: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginRight: 6,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    paddingVertical: 8,
  },
});
