import React from "react";
import { Tabs, Redirect } from "expo-router";
import { useTheme, ActivityIndicator } from "react-native-paper";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { socketService } from "@/utils/socket";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TalksyUser, TalksyGroup } from "@/types/domain";
import { getId } from "@/utils/ids";

export default function TabLayout() {
  const theme = useTheme();
  const { data: user, isLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const res = await apiRequest<TalksyUser>("/auth/me").catch(() => null);
      if (res) {
        socketService.connect();
      }
      return res;
    },
    retry: false,
  });

  const { data: requests } = useQuery<TalksyUser[]>({
    queryKey: ["friend-requests"],
    queryFn: () => apiRequest<TalksyUser[]>("/users/friend-requests"),
    enabled: !!user,
  });

  const { data: groups } = useQuery<TalksyGroup[]>({
    queryKey: ["joined-groups"],
    queryFn: () => apiRequest<TalksyGroup[]>("/groups/joined"),
    enabled: !!user,
  });

  const getPendingApprovalsCount = (): number => {
    if (!groups || !user) return 0;
    let count = 0;
    const userId = getId(user);
    groups.forEach((group) => {
      const isCreator = getId(group.createdBy) === userId;
      if (isCreator && group.joinRequests) {
        count += group.joinRequests.length;
      }
    });
    return count;
  };

  const approvalsCount = getPendingApprovalsCount();
  const requestsCount = requests?.length || 0;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarBadge: requestsCount > 0 ? requestsCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarBadge: approvalsCount > 0 ? approvalsCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
