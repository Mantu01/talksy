import React from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { socketService } from "@/utils/socket";
import { TalksyUser } from "@/types/domain";

export default function RootIndex() {
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
