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
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { TalksyMessage, TalksyUser } from "@/types/domain";
import { getId } from "@/utils/ids";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
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
  const [text, setText] = useLocalState(["chat-input", currentUserId, id], "");

  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = React.useRef<boolean>(false);

  const { data: friends } = useQuery<TalksyUser[]>({
    queryKey: ["friends"],
    queryFn: () => apiRequest<TalksyUser[]>("/users/friends"),
  });

  const partner = friends?.find((f) => getId(f) === id);

  const { data: userStatus } = useQuery<"online" | "offline" | null>({
    queryKey: ["user-status", id],
    queryFn: () => null,
    enabled: !!id,
  });

  const { data: isTyping } = useQuery<boolean | null>({
    queryKey: ["user-typing", id],
    queryFn: () => null,
    enabled: !!id,
  });

  const { data: messages, isLoading } = useQuery<TalksyMessage[]>({
    queryKey: ["messages", id],
    queryFn: () => apiRequest<TalksyMessage[]>(`/chats/messages/${id}`),
  });

  const handleTextChange = (val: string) => {
    setText(val);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketService.sendTypingStatus(id, true);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketService.sendTypingStatus(id, false);
    }, 2000);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    socketService.sendMessage(id, null, text.trim());
    setText("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingRef.current = false;
    socketService.sendTypingStatus(id, false);
  };

  const handleHeaderPress = () => {
    router.push(`/chat/details/${id}`);
  };

  const reversedMessages = messages ? [...messages].reverse() : [];

  const renderMessage = ({ item }: { item: TalksyMessage }) => {
    const currentUserId = getId(currentUser);
    const senderId = getId(typeof item.sender === "string" ? item.sender : item.sender);
    const isMe = senderId === currentUserId;

    return (
      <MessageBubble
        text={item.text}
        createdAt={item.createdAt}
        isMe={isMe}
        showAvatar={false}
      />
    );
  };

  const headerTitle = partner?.name || "Chat";
  const headerAvatar = partner?.profile;

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
          <View style={styles.avatarWrapper}>
            <SafeAvatar uri={headerAvatar} name={headerTitle} size={38} />
            {userStatus === "online" && (
              <View style={[styles.onlineDot, { backgroundColor: "#4CAF50", borderColor: theme.colors.surface }]} />
            )}
          </View>
        </Pressable>
        <Pressable onPress={handleHeaderPress} style={styles.headerTitlePressable}>
          <Appbar.Content
            title={headerTitle}
            subtitle={
              userStatus === "online" ? (
                <Text style={{ color: "#4CAF50", fontSize: 11, fontWeight: "600" }}>
                  Active now
                </Text>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, opacity: 0.8 }}>
                  Offline
                </Text>
              )
            }
          />
        </Pressable>
        <Appbar.Action icon="phone-outline" onPress={() => {}} iconColor={theme.colors.primary} />
        <Appbar.Action icon="video-outline" onPress={() => {}} iconColor={theme.colors.primary} />
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
            ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
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
              onChangeText={handleTextChange}
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
    marginRight: 4,
  },
  avatarWrapper: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
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
