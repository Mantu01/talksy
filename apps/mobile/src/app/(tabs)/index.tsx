import React from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { List, Avatar, FAB, useTheme, SegmentedButtons, Text, Divider, ActivityIndicator } from "react-native-paper";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";

export default function ChatsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useLocalState("chats-filter", "all");

  const { data: friends, isLoading: isLoadingFriends, refetch: refetchFriends } = useQuery<any[]>({
    queryKey: ["friends"],
    queryFn: () => apiRequest("/users/friends"),
  });

  const { data: groups, isLoading: isLoadingGroups, refetch: refetchGroups } = useQuery<any[]>({
    queryKey: ["joined-groups"],
    queryFn: () => apiRequest("/groups/joined"),
  });

  const onRefresh = () => {
    refetchFriends();
    refetchGroups();
  };

  const listData: any[] = [];

  if (filter === "all" || filter === "friends") {
    if (friends) {
      listData.push(...friends.map(f => ({ ...f, isGroup: false, key: `user-${f._id}` })));
    }
  }

  if (filter === "all" || filter === "groups") {
    if (groups) {
      listData.push(...groups.map(g => ({ ...g, isGroup: true, key: `group-${g._id}` })));
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const title = item.isGroup ? item.title : item.name;
    const subtitle = item.isGroup ? item.description : item.bio || "Hey there! I am using Talksy.";
    const imageUri = item.isGroup ? item.logo : item.profile;
    const initial = title ? title.charAt(0).toUpperCase() : "";

    const handlePress = () => {
      if (item.isGroup) {
        router.push(`/group-chat/${item._id}`);
      } else {
        router.push(`/chat/${item._id}`);
      }
    };

    return (
      <List.Item
        title={title}
        description={subtitle}
        descriptionNumberOfLines={1}
        onPress={handlePress}
        left={(props) =>
          imageUri ? (
            <Avatar.Image {...props} size={48} source={{ uri: imageUri }} />
          ) : (
            <Avatar.Text {...props} size={48} label={initial} />
          )
        }
        right={(props) => (
          <List.Icon {...props} icon={item.isGroup ? "chevron-right" : "chat-outline"} />
        )}
        style={styles.listItem}
      />
    );
  };

  if (isLoadingFriends || isLoadingGroups) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
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
        <View style={styles.center}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            No chats found. Go to Explore to find friends or groups!
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <Divider />}
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  filterWrapper: {
    padding: 12,
  },
  segmentedButtons: {
    width: "100%",
  },
  listItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.6,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
