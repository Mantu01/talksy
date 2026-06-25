import React from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { List, Avatar, Button, useTheme, SegmentedButtons, Text, Divider, ActivityIndicator } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";

export default function ExploreScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [exploreTab, setExploreTab] = useLocalState("explore-tab", "people");

  const { data: authUser } = useQuery<any>({
    queryKey: ["auth-user"],
    queryFn: () => apiRequest("/auth/me").catch(() => null),
  });

  const { data: people, isLoading: isLoadingPeople, refetch: refetchPeople } = useQuery<any[]>({
    queryKey: ["explore-users"],
    queryFn: () => apiRequest("/users/explore"),
    enabled: exploreTab === "people",
  });

  const { data: groups, isLoading: isLoadingGroups, refetch: refetchGroups } = useQuery<any[]>({
    queryKey: ["explore-groups"],
    queryFn: () => apiRequest("/groups/explore"),
    enabled: exploreTab === "groups",
  });

  const { data: requests, isLoading: isLoadingRequests, refetch: refetchRequests } = useQuery<any[]>({
    queryKey: ["friend-requests"],
    queryFn: () => apiRequest("/users/friend-requests"),
    enabled: exploreTab === "requests",
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/users/friend-request/send/${userId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-users"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });

  const joinRequestMutation = useMutation({
    mutationFn: async (groupId: string) => {
      return apiRequest(`/groups/join-request/${groupId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explore-groups"] });
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/users/friend-request/accept/${userId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });

  const declineFriendMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/users/friend-request/decline/${userId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
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

  const renderPerson = ({ item }: { item: any }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : "";
    const isPending = sendRequestMutation.isPending && sendRequestMutation.variables === item._id;
    const isSent = authUser?.friendRequestsSent?.some((id: any) => {
      const stringId = typeof id === "object" ? id._id || id.id || id : id;
      return stringId?.toString() === item._id?.toString();
    });

    return (
      <List.Item
        title={item.name}
        description={item.bio || "Hey there! I am using Talksy."}
        left={(props) =>
          item.profile ? (
            <Avatar.Image {...props} size={48} source={{ uri: item.profile }} />
          ) : (
            <Avatar.Text {...props} size={48} label={initial} />
          )
        }
        right={() => (
          <View style={styles.actionContainer}>
            {isSent ? (
              <Button
                mode="outlined"
                disabled
              >
                Request Sent
              </Button>
            ) : (
              <Button
                mode="contained-tonal"
                onPress={() => sendRequestMutation.mutate(item._id)}
                disabled={isPending}
                loading={isPending}
              >
                Add Friend
              </Button>
            )}
          </View>
        )}
        style={styles.listItem}
      />
    );
  };

  const renderGroup = ({ item }: { item: any }) => {
    const initial = item.title ? item.title.charAt(0).toUpperCase() : "";
    const isPending = joinRequestMutation.isPending && joinRequestMutation.variables === item._id;
    const isRequested = item.joinRequests?.some((id: any) => {
      const stringId = typeof id === "object" ? id._id || id.id || id : id;
      const currentUserId = authUser?.id || authUser?._id;
      return stringId?.toString() === currentUserId?.toString();
    });

    return (
      <List.Item
        title={item.title}
        description={item.description || "Join this group to connect."}
        left={(props) =>
          item.logo ? (
            <Avatar.Image {...props} size={48} source={{ uri: item.logo }} />
          ) : (
            <Avatar.Text {...props} size={48} label={initial} />
          )
        }
        right={() => (
          <View style={styles.actionContainer}>
            {isRequested ? (
              <Button
                mode="outlined"
                disabled
              >
                Requested
              </Button>
            ) : (
              <Button
                mode="contained-tonal"
                onPress={() => joinRequestMutation.mutate(item._id)}
                disabled={isPending}
                loading={isPending}
              >
                Join
              </Button>
            )}
          </View>
        )}
        style={styles.listItem}
      />
    );
  };

  const renderRequest = ({ item }: { item: any }) => {
    const initial = item.name ? item.name.charAt(0).toUpperCase() : "";
    const isAccepting = acceptFriendMutation.isPending && acceptFriendMutation.variables === item._id;
    const isDeclining = declineFriendMutation.isPending && declineFriendMutation.variables === item._id;

    return (
      <List.Item
        title={item.name}
        description={item.bio || "Wants to connect with you!"}
        left={(props) =>
          item.profile ? (
            <Avatar.Image {...props} size={48} source={{ uri: item.profile }} />
          ) : (
            <Avatar.Text {...props} size={48} label={initial} />
          )
        }
        right={() => (
          <View style={styles.actionRow}>
            <Button
              mode="contained"
              compact
              onPress={() => acceptFriendMutation.mutate(item._id)}
              disabled={isAccepting || isDeclining}
              loading={isAccepting}
              style={styles.actionBtn}
            >
              Accept
            </Button>
            <Button
              mode="outlined"
              compact
              onPress={() => declineFriendMutation.mutate(item._id)}
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

  const isLoading = exploreTab === "people"
    ? isLoadingPeople
    : exploreTab === "groups"
    ? isLoadingGroups
    : isLoadingRequests;

  const listData = exploreTab === "people"
    ? people
    : exploreTab === "groups"
    ? groups
    : requests;

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
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : !listData || listData.length === 0 ? (
        <View style={styles.center}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            {exploreTab === "people"
              ? "No new people to discover right now!"
              : exploreTab === "groups"
              ? "No new groups to discover right now!"
              : "No pending friend requests."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item._id}
          renderItem={
            exploreTab === "people"
              ? renderPerson
              : exploreTab === "groups"
              ? renderGroup
              : renderRequest
          }
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
  actionContainer: {
    justifyContent: "center",
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
