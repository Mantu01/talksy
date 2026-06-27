import React from "react";
import { View, StyleSheet, ScrollView, Platform, Pressable, FlatList } from "react-native";
import { useTheme, Text, ActivityIndicator, Card, Button, TextInput, IconButton, Portal, Dialog, List, Divider, Snackbar } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import * as ImagePicker from "expo-image-picker";
import { SafeAvatar } from "@/components/common/SafeAvatar";
import { SafeBanner } from "@/components/common/SafeBanner";
import { ScreenState } from "@/components/common/ScreenState";
import { TalksyGroup, TalksyUser } from "@/types/domain";
import { getId } from "@/utils/ids";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupDetailsScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: currentUser } = useQuery<TalksyUser | null>({
    queryKey: ["auth-user"],
  });

  const { data: group, isLoading, error } = useQuery<TalksyGroup>({
    queryKey: ["group-details", id],
    queryFn: () => apiRequest<TalksyGroup>(`/groups/${id}`),
    enabled: !!id,
  });

  if (isLoading || !currentUser) {
    return <ScreenState loading />;
  }

  if (error || !group) {
    return <ScreenState title="Failed to load group details." />;
  }

  return <GroupDetailsForm group={group} currentUser={currentUser} />;
}

function GroupDetailsForm({ group, currentUser }: { group: TalksyGroup; currentUser: TalksyUser }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const currentUserId = getId(currentUser);
  const isAdmin = getId(group.createdBy) === currentUserId;

  const [title, setTitle] = useLocalState(["group-details-title", group._id], group.title);
  const [description, setDescription] = useLocalState(["group-details-desc", group._id], group.description || "");
  const [logoUri, setLogoUri] = useLocalState(["group-details-logo", group._id], "");

  const [pickerVisible, setPickerVisible] = useLocalState(["group-details-picker", group._id], false);
  const [snackbarVisible, setSnackbarVisible] = useLocalState(["group-details-sb", group._id], false);
  const [snackbarMessage, setSnackbarMessage] = useLocalState(["group-details-sb-msg", group._id], "");
  const [snackbarType, setSnackbarType] = useLocalState<"info" | "error">(["group-details-sb-type", group._id], "info");

  const showSnackbar = (message: string, type: "info" | "error" = "info") => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const pickLogo = async (source: "camera" | "gallery") => {
    try {
      let result;
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showSnackbar("Camera permission is required", "error");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showSnackbar("Gallery permission is required", "error");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
      }
    } catch (err) {
      showSnackbar("Failed to pick image", "error");
    }
  };

  const appendFileToFormData = async (formData: FormData, fieldName: string, uri: string) => {
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append(fieldName, blob, `${fieldName}.jpg`);
    } else {
      const uriParts = uri.split(".");
      const fileType = uriParts[uriParts.length - 1] || "jpg";
      formData.append(fieldName, {
        uri: uri,
        name: `${fieldName}.${fileType}`,
        type: `image/${fileType}`,
      } as unknown as Blob);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);

      if (logoUri) {
        await appendFileToFormData(formData, "logo", logoUri);
      }

      return apiRequest<TalksyGroup>(`/groups/${group._id}`, {
        method: "PUT",
        body: formData,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["group-details", group._id], data);
      queryClient.invalidateQueries({ queryKey: ["joined-groups"] });
      setLogoUri("");
      showSnackbar("Group details updated successfully!");
    },
    onError: (err: Error) => {
      showSnackbar(err.message || "Failed to update group details", "error");
    },
  });

  const creatorName = typeof group.createdBy === "object" && "name" in group.createdBy ? group.createdBy.name : "Someone";
  const currentLogo = logoUri || group.logo;

  return (
    <SafeAreaView style={[styles.mainWrapper, { backgroundColor: theme.colors.background }]} edges={["top", "bottom"]}>
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <SafeBanner style={styles.banner} placeholderText="Group Details" />
          <View style={[styles.avatarWrapper, { backgroundColor: theme.colors.surface }]}>
            <SafeAvatar uri={currentLogo} name={group.title} size={100} style={styles.avatar} />
            {isAdmin ? (
              <View style={styles.avatarEditOverlay}>
                <IconButton
                  icon="pencil"
                  mode="contained"
                  size={18}
                  containerColor={theme.colors.primary}
                  iconColor={theme.colors.onPrimary}
                  style={styles.avatarEditBtn}
                  onPress={() => setPickerVisible(true)}
                />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.formContainer}>
          {isAdmin ? (
            <Card style={styles.sectionCard}>
              <Card.Content style={styles.sectionContent}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                  Edit Group Details
                </Text>
                <TextInput
                  label="Group Title"
                  value={title}
                  onChangeText={setTitle}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Description"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                />
                <Button
                  mode="contained"
                  onPress={() => updateMutation.mutate()}
                  loading={updateMutation.isPending}
                  disabled={updateMutation.isPending || !title.trim()}
                  style={styles.saveBtn}
                >
                  Save Group Changes
                </Button>
              </Card.Content>
            </Card>
          ) : (
            <Card style={styles.sectionCard}>
              <Card.Content style={styles.sectionContent}>
                <Text variant="headlineSmall" style={styles.groupTitle}>
                  {group.title}
                </Text>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  {group.description || "No description set for this group."}
                </Text>
                <Divider style={{ marginVertical: 8 }} />
                <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
                  Created by {creatorName}
                </Text>
              </Card.Content>
            </Card>
          )}

          <Card style={styles.sectionCard}>
            <Card.Content style={styles.sectionContent}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Members ({group.members?.length || 0})
              </Text>
              <View style={styles.membersList}>
                {group.members?.map((member) => {
                  const mUser = typeof member === "object" ? member : null;
                  const mName = mUser?.name || "User";
                  const mAvatar = mUser?.profile;
                  const isCreator = mUser && mUser._id.toString() === getId(group.createdBy);

                  return (
                    <View key={getId(member)} style={styles.memberRow}>
                      <SafeAvatar uri={mAvatar} name={mName} size={36} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text variant="bodyLarge" style={{ fontWeight: "500" }}>
                          {mName}
                        </Text>
                        {isCreator ? (
                          <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: "bold" }}>
                            Admin / Creator
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card.Content>
          </Card>

          <Button mode="outlined" onPress={() => router.back()} style={styles.backBtn}>
            Go Back
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Update Group Logo</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Take Photo"
              description="Capture image using camera"
              left={(props) => <List.Icon {...props} icon="camera" />}
              onPress={() => {
                pickLogo("camera");
                setPickerVisible(false);
              }}
            />
            <Divider />
            <List.Item
              title="Choose from Gallery"
              description="Pick image from media library"
              left={(props) => <List.Icon {...props} icon="image" />}
              onPress={() => {
                pickLogo("gallery");
                setPickerVisible(false);
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{
          backgroundColor: snackbarType === "error" ? theme.colors.error : theme.colors.primary,
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
    height: 180,
    marginBottom: 40,
  },
  banner: {
    height: 130,
  },
  avatarWrapper: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatar: {
    borderWidth: 3,
    borderColor: "transparent",
  },
  avatarEditOverlay: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  avatarEditBtn: {
    margin: 0,
    width: 32,
    height: 32,
  },
  formContainer: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    borderRadius: 12,
    elevation: 1,
  },
  sectionContent: {
    gap: 12,
  },
  sectionTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  groupTitle: {
    fontWeight: "bold",
  },
  input: {
    width: "100%",
  },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  backBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  membersList: {
    gap: 12,
    marginTop: 4,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
