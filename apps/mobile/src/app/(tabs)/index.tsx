import React from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { FAB, useTheme, SegmentedButtons } from "react-native-paper";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import { ChatPreviewRow } from "@/components/chat/ChatPreviewRow";
import { ScreenState } from "@/components/common/ScreenState";
import { ChatListItem, TalksyGroup, TalksyUser } from "@/types/domain";
import { getId } from "@/utils/ids";

export default function ChatsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useLocalState("chats-filter", "all");

  const { data: conversations, isLoading, refetch } = useQuery<ChatListItem[]>({
    queryKey: ["recent-conversations"],
    queryFn: () => apiRequest<ChatListItem[]>("/chats/recent"),
  });

  const onRefresh = () => {
    refetch();
  };

  const listData = (conversations || []).filter((item) => {
    if (filter === "all") return true;
    if (filter === "friends") return item.kind === "friend";
    if (filter === "groups") return item.kind === "group";
    return true;
  });

  const renderItem = ({ item }: { item: ChatListItem }) => {
    const handlePress = (): void => {
      if (item.kind === "group") {
        router.push(`/group-chat/${item.id}`);
      } else {
        router.push(`/chat/${item.id}`);
      }
    };

    return <ChatPreviewRow item={item} onPress={handlePress} />;
  };

  if (isLoading) {
    return <ScreenState loading />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterWrapper}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: "all", label: "All" },
            { value: "friends", label: "Friends" },
            { value: "groups", label: "Groups" },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {listData.length === 0 ? (
        <ScreenState title="No chats yet. Explore people or groups to start talking." />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        />
      )}

      <FAB
        icon="plus"
        label="Group"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        onPress={() => router.push("/create-group")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterWrapper: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  segmentedButtons: {
    width: "100%",
  },
  listContent: {
    paddingBottom: 96,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
