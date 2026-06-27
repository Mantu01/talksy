import React from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Button, useTheme, SegmentedButtons } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import { router } from "expo-router";
import { ActionListRow } from "@/components/explore/ActionListRow";
import { ChatPreviewRow } from "@/components/chat/ChatPreviewRow";
import { ScreenState } from "@/components/common/ScreenState";
import { ChatListItem, GroupApproval, TalksyGroup, TalksyUser } from "@/types/domain";
import { getId } from "@/utils/ids";

const isUser = (value: unknown): value is TalksyUser => (
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  "email" in value
);

export default function GroupsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useLocalState("groups-subtab", "joined");

  const { data: user } = useQuery<TalksyUser | null>({
    queryKey: ["auth-user"],
    queryFn: () => apiRequest<TalksyUser>("/auth/me").catch(() => null),
  });

  const { data: groups, isLoading, refetch } = useQuery<TalksyGroup[]>({
    queryKey: ["joined-groups"],
    queryFn: () => apiRequest<TalksyGroup[]>("/groups/joined"),
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      return apiRequest(`/groups/join-request/accept/${groupId}/${userId}`, { method: "POST", body: JSON.stringify({}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joined-groups"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      return apiRequest(`/groups/join-request/decline/${groupId}/${userId}`, { method: "POST", body: JSON.stringify({}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joined-groups"] });
    },
  });

  const onRefresh = () => {
    refetch();
  };

  const getPendingApprovals = (): GroupApproval[] => {
    if (!groups || !user) return [];
    const approvals: GroupApproval[] = [];
    const userId = getId(user);
    groups.forEach((group) => {
      const isCreator = getId(group.createdBy) === userId;
      if (isCreator && group.joinRequests && group.joinRequests.length > 0) {
        group.joinRequests.forEach((requester) => {
          if (isUser(requester)) {
            const requesterId = getId(requester);
            approvals.push({
              group,
              requester,
              key: `${group._id}-${requesterId}`,
            });
          }
        });
      }
    });
    return approvals;
  };

  const approvals = getPendingApprovals();

  const renderGroup = ({ item }: { item: TalksyGroup }) => {
    const createdByLabel = typeof item.createdBy === "object" && "name" in item.createdBy ? item.createdBy.name : "Someone";
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";
    const row: ChatListItem = {
      key: item._id,
      id: item._id,
      title: item.title,
      subtitle: `${item.description || "Group conversation"} • Created by ${createdByLabel}${dateStr ? ` on ${dateStr}` : ""}`,
      imageUri: item.logo,
      kind: "group",
      membersCount: item.members?.length || 1,
    };

    return <ChatPreviewRow item={row} onPress={() => router.push(`/group-chat/${item._id}`)} />;
  };

  const renderApproval = ({ item }: { item: GroupApproval }) => {
    const groupName = item.group.title;
    const reqName = item.requester.name || "User";
    const requesterId = getId(item.requester);

    const isAccepting = acceptMutation.isPending &&
      acceptMutation.variables?.groupId === item.group._id &&
      acceptMutation.variables?.userId === requesterId;

    const isDeclining = declineMutation.isPending &&
      declineMutation.variables?.groupId === item.group._id &&
      declineMutation.variables?.userId === requesterId;

    return (
      <ActionListRow
        title={reqName}
        description={`Wants to join "${groupName}"`}
        imageUri={item.requester.profile}
        meta={item.requester.email}
        action={
          <View style={styles.actionRow}>
            <Button
              mode="contained"
              compact
              onPress={() => acceptMutation.mutate({ groupId: item.group._id, userId: requesterId })}
              disabled={isAccepting || isDeclining}
              loading={isAccepting}
              style={styles.actionBtn}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => declineMutation.mutate({ groupId: item.group._id, userId: requesterId })}
              disabled={isAccepting || isDeclining}
              loading={isDeclining}
              style={styles.actionBtn}
            >
              Reject
            </Button>
          </View>
        }
      />
    );
  };

  if (isLoading) {
    return <ScreenState loading />;
  }

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

      {subTab === "joined" ? (
        !groups || groups.length === 0 ? (
          <ScreenState title="You have not joined any groups yet. Explore groups to join one." />
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item._id}
            renderItem={renderGroup}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
          />
        )
      ) : approvals.length === 0 ? (
        <ScreenState
          title="No pending join requests to approve."
        />
      ) : (
        <FlatList
          data={approvals}
          keyExtractor={(item) => item.key}
          renderItem={renderApproval}
          contentContainerStyle={styles.listContent}
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
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  segmentedButtons: {
    width: "100%",
  },
  listContent: {
    paddingBottom: 24,
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
