import React from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { Button, useTheme, SegmentedButtons } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import { ActionListRow } from "@/components/explore/ActionListRow";
import { ScreenState } from "@/components/common/ScreenState";
import { TalksyGroup, TalksyUser } from "@/types/domain";
import { getId, hasId } from "@/utils/ids";

export default function ExploreScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [exploreTab, setExploreTab] = useLocalState("explore-tab", "people");

  const { data: authUser } = useQuery<TalksyUser | null>({
    queryKey: ["auth-user"],
    queryFn: () => apiRequest<TalksyUser>("/auth/me").catch(() => null),
  });

  const { data: people, isLoading: isLoadingPeople, refetch: refetchPeople } = useQuery<TalksyUser[]>({
    queryKey: ["explore-users"],
    queryFn: () => apiRequest<TalksyUser[]>("/users/explore"),
    enabled: exploreTab === "people",
  });

  const { data: groups, isLoading: isLoadingGroups, refetch: refetchGroups } = useQuery<TalksyGroup[]>({
    queryKey: ["explore-groups"],
    queryFn: () => apiRequest<TalksyGroup[]>("/groups/explore"),
    enabled: exploreTab === "groups",
  });

  const { data: requests, isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery<TalksyUser[]>({
    queryKey: ["friend-requests"],
    queryFn: () => apiRequest<TalksyUser[]>("/users/friend-requests"),
    enabled: exploreTab === "requests",
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/users/friend-request/send/${userId}`, { method: "POST", body: JSON.stringify({}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-users"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });

  const joinRequestMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/groups/join-request/${groupId}`, { method: "POST", body: JSON.stringify({}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/users/friend-request/accept/${userId}`, { method: "POST", body: JSON.stringify({}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      queryClient.invalidateQueries({ queryKey: ["explore-users"] });
    },
  });

  const declineFriendMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/users/friend-request/decline/${userId}`, { method: "POST", body: JSON.stringify({}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      queryClient.invalidateQueries({ queryKey: ["explore-users"] });
    },
  });

  const onRefresh = () => {
    if (exploreTab === "people") {
      refetchPeople();
    } else if (exploreTab === "groups") {
      refetchGroups();
    } else {
      refetchRequests();
    }
  };

  const renderPerson = ({ item }: { item: TalksyUser }) => {
    const userId = getId(item);
    const isPending = sendRequestMutation.isPending && sendRequestMutation.variables === userId;
    const isSent = hasId(authUser?.friendRequestsSent, userId);

    return (
      <ActionListRow
        title={item.name}
        description={item.bio || "Hey there! I am using Talksy."}
        imageUri={item.profile}
        action={
          <>
            {isSent ? (
              <Button mode="outlined" disabled compact>
                Request Sent
              </Button>
            ) : (
              <Button
                mode="contained-tonal"
                onPress={() => sendRequestMutation.mutate(userId)}
                disabled={isPending}
                loading={isPending}
                compact
              >
                Add Friend
              </Button>
            )}
          </>
        }
      />
    );
  };

  const renderGroup = ({ item }: { item: TalksyGroup }) => {
    const isPending = joinRequestMutation.isPending && joinRequestMutation.variables === item._id;
    const currentUserId = getId(authUser);
    const isRequested = Boolean(item.joinRequests?.some((id) => getId(id) === currentUserId));

    return (
      <ActionListRow
        title={item.title}
        description={item.description || "Join this group to connect."}
        imageUri={item.logo}
        meta={`${item.members?.length || 1} members`}
        action={
          <>
            {isRequested ? (
              <Button mode="outlined" disabled compact>
                Requested
              </Button>
            ) : (
              <Button
                mode="contained-tonal"
                onPress={() => joinRequestMutation.mutate(item._id)}
                disabled={isPending}
                loading={isPending}
                compact
              >
                Join
              </Button>
            )}
          </>
        }
      />
    );
  };

  const renderRequest = ({ item }: { item: TalksyUser }) => {
    const userId = getId(item);
    const isAccepting = acceptFriendMutation.isPending && acceptFriendMutation.variables === userId;
    const isDeclining = declineFriendMutation.isPending && declineFriendMutation.variables === userId;

    return (
      <ActionListRow
        title={item.name}
        description={item.bio || "Wants to connect with you!"}
        imageUri={item.profile}
        action={
          <View style={styles.actionRow}>
            <Button
              mode="contained"
              compact
              onPress={() => acceptFriendMutation.mutate(userId)}
              disabled={isAccepting || isDeclining}
              loading={isAccepting}
              style={styles.actionBtn}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => declineFriendMutation.mutate(userId)}
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

  const isLoading = exploreTab === "people"
    ? isLoadingPeople
    : exploreTab === "groups"
    ? isLoadingGroups
    : isLoadingRequests;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.tabSelector}>
        <SegmentedButtons
          value={exploreTab}
          onValueChange={setExploreTab}
          buttons={[
            { value: "people", label: "People" },
            { value: "groups", label: "Groups" },
            { value: "requests", label: "Requests" },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {isLoading ? (
        <ScreenState loading />
      ) : exploreTab === "people" ? (
        !people || people.length === 0 ? (
          <ScreenState title="No new people to discover right now." />
        ) : (
          <FlatList
            data={people}
            keyExtractor={(item) => getId(item)}
            renderItem={renderPerson}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
          />
        )
      ) : exploreTab === "groups" ? (
        !groups || groups.length === 0 ? (
          <ScreenState title="No new groups to discover right now." />
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
      ) : !requests || requests.length === 0 ? (
        <ScreenState
          title="No pending friend requests."
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => getId(item)}
          renderItem={renderRequest}
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
    gap: 6,
  },
  actionBtn: {
    borderRadius: 6,
  },
});
