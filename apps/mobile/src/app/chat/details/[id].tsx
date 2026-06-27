import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useTheme, Text, ActivityIndicator, Card, Button } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { SafeAvatar } from "@/components/common/SafeAvatar";
import { SafeBanner } from "@/components/common/SafeBanner";
import { ScreenState } from "@/components/common/ScreenState";
import { TalksyUser } from "@/types/domain";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: user, isLoading, error } = useQuery<TalksyUser>({
    queryKey: ["user-details", id],
    queryFn: () => apiRequest<TalksyUser>(`/users/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return <ScreenState loading />;
  }

  if (error || !user) {
    return <ScreenState title="Failed to load user details." />;
  }

  const birthDate = user.dob ? new Date(user.dob).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : "";

  return (
    <SafeAreaView style={[styles.mainWrapper, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <SafeBanner uri={user.banner} style={styles.banner} />
          <View style={[styles.avatarWrapper, { backgroundColor: theme.colors.surface }]}>
            <SafeAvatar uri={user.profile} name={user.name} size={110} style={styles.avatar} />
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text variant="headlineMedium" style={[styles.name, { color: theme.colors.onBackground }]}>
            {user.name}
          </Text>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                About
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {user.bio || "Hey there! I am using Talksy."}
              </Text>
            </Card.Content>
          </Card>

          {birthDate ? (
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                  Birthday
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  {birthDate}
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          <Button mode="contained" onPress={() => router.back()} style={styles.backBtn}>
            Go Back
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    position: "relative",
    height: 200,
    marginBottom: 50,
  },
  banner: {
    height: 150,
  },
  avatarWrapper: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    width: 118,
    height: 118,
    borderRadius: 59,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatar: {
    borderWidth: 4,
    borderColor: "transparent",
  },
  detailsContainer: {
    padding: 18,
    gap: 16,
    alignItems: "center",
  },
  name: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    width: "100%",
    borderRadius: 12,
    elevation: 1,
  },
  cardContent: {
    gap: 8,
  },
  sectionTitle: {
    fontWeight: "bold",
  },
  backBtn: {
    marginTop: 12,
    width: "100%",
    paddingVertical: 6,
    borderRadius: 8,
  },
});
