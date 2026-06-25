import React from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { List, Avatar, Button, useTheme, SegmentedButtons, Text, Divider, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import { router } from "expo-router";

export default function GroupsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useLocalState("groups-subtab", "joined");

  const { data: user } = useQuery<any>({
    queryKey: ["auth-user"],
    queryFn: () => apiRequest("/auth/me").catch(() => null),
  });

  const { data: groups, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["joined-groups"],
    queryFn: () => apiRequest("/groups/joined"),
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      return apiRequest(`/groups/join-request/accept/${groupId}/${userId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joined-groups"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      return apiRequest(`/groups/join-request/decline/${groupId}/${userId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joined-groups"] });
    },
  });

  const onRefresh = () => {
    refetch();
  };

  const getPendingApprovals = () => {
    if (!groups || !user) return [];
    const approvals: any[] = [];
    groups.forEach((group) => {
      const isCreator = group.createdBy?._id === user.id || group.createdBy === user.id;
      if (isCreator && group.joinRequests && group.joinRequests.length > 0) {
        group.joinRequests.forEach((reqUser: any) => {
          approvals.push({
            group,
            reqUser,
            key: `${group._id}-${reqUser._id || reqUser}`,
          });
        });
      }
    });
    return approvals;
  };

  const approvals = getPendingApprovals();

  const renderGroup = ({ item }: { item: any }) => {
    const initial = item.title ? item.title.charAt(0).toUpperCase() : "";
    const createdByLabel = item.createdBy?.name || "Someone";
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";

    return (
      <List.Item
        title={item.title}
        description={`Created by ${createdByLabel} on ${dateStr}\n${item.description || ""}`}
        descriptionNumberOfLines={2}
        onPress={() => router.push(`/group-chat/${item._id}`)}
        left={(props) =>
          item.logo ? (
            <Avatar.Image {...props} size={48} source={{ uri: item.logo }} />
          ) : (
            <Avatar.Text {...props} size={48} label={initial} />
          )
        }
        right={(props) => <List.Icon {...props} icon="chevron-right" />}
        style={styles.listItem}
      />
    );
  };

  const renderApproval = ({ item }: { item: any }) => {
    const groupName = item.group.title;
    const reqName = item.reqUser.name || "User";
    const initial = reqName.charAt(0).toUpperCase();

    const isAccepting = acceptMutation.isPending &&
      acceptMutation.variables?.groupId === item.group._id &&
      acceptMutation.variables?.userId === item.reqUser._id;

    const isDeclining = declineMutation.isPending &&
      declineMutation.variables?.groupId === item.group._id &&
      declineMutation.variables?.userId === item.reqUser._id;

    return (
      <List.Item
        title={reqName}
        description={`Wants to join "${groupName}"`}
        left={(props) =>
          item.reqUser.profile ? (
            <Avatar.Image {...props} size={48} source={{ uri: item.reqUser.profile }} />
          ) : (
            <Avatar.Text {...props} size={48} label={initial} />
          )
        }
        right={() => (
          <View style={styles.actionRow}>
            <Button
              mode="contained"
              compact
              onPress={() => acceptMutation.mutate({ groupId: item.group._id, userId: item.reqUser._id })}
              disabled={isAccepting || isDeclining}
              loading={isAccepting}
              style={styles.actionBtn}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => declineMutation.mutate({ groupId: item.group._id, userId: item.reqUser._id })}
              disabled={isAccepting || isDeclining}
              loading={isDeclining}
              style={styles.actionBtn}
            >
              Reject
            </Button>
          </View>
        )}
        style={styles.listItem}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const listData = subTab === "joined" ? groups : approvals;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.tabSelector}>
        <SegmentedButtons
          value={subTab}
          onValueChange={setSubTab}
          buttons={[
            { value: "joined", label: "My Groups" },
            {
              value: "approvals",
              label: `Approvals (${approvals.length})`,
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {(!listData || listData.length === 0) ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {subTab === "joined"
              ? "You haven't joined any groups yet. Explore groups to join one!"
              : "No pending join requests to approve."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => (subTab === "joined" ? item._id : item.key)}
          renderItem={subTab === "joined" ? renderGroup : renderApproval}
          ItemSeparatorComponent={() => <Divider />}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabSelector: {
    padding: 12,
  },
  segmentedButtons: {
    width: "100%",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.6,
  },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    borderRadius: 6,
  },
});
