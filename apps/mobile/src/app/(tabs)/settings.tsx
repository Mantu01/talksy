import React from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { TextInput, Button, Text, useTheme, Card, ActivityIndicator, IconButton, Portal, Dialog, List, Divider, Snackbar } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setToken } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { socketService } from "@/utils/socket";
import { SafeAvatar } from "@/components/common/SafeAvatar";
import { SafeBanner } from "@/components/common/SafeBanner";
import { TalksyUser } from "@/types/domain";
import { getId } from "@/utils/ids";

export default function SettingsScreen() {
  const theme = useTheme();
  const { data: user, isLoading } = useQuery<TalksyUser | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      try {
        return await apiRequest<TalksyUser>("/auth/me");
      } catch {
        return null;
      }
    },
  });

  if (isLoading || !user) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <SettingsForm user={user} />;
}

function SettingsForm({ user }: { user: TalksyUser }) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const dobParts = user.dob ? user.dob.split("-") : ["", "", ""];
  const initialYear = dobParts[0] || "";
  const initialMonth = dobParts[1] || "";
  const initialDay = dobParts[2] || "";

  const userId = getId(user);
  const [name, setName] = useLocalState(["settings-name", userId, user.name], user.name);
  const [email, setEmail] = useLocalState(["settings-email", userId, user.email], user.email);
  const [bio, setBio] = useLocalState(["settings-bio", userId, user.bio || ""], user.bio || "");
  const [dobDay, setDobDay] = useLocalState(["settings-dob-day", userId, initialDay], initialDay);
  const [dobMonth, setDobMonth] = useLocalState(["settings-dob-month", userId, initialMonth], initialMonth);
  const [dobYear, setDobYear] = useLocalState(["settings-dob-year", userId, initialYear], initialYear);

  const [currentPassword, setCurrentPassword] = useLocalState(["settings-curr-pass", userId], "");
  const [newPassword, setNewPassword] = useLocalState(["settings-new-pass", userId], "");
  const [confirmPassword, setConfirmPassword] = useLocalState(["settings-conf-pass", userId], "");

  const [profileUri, setProfileUri] = useLocalState(["settings-profile-uri", userId], "");
  const [bannerUri, setBannerUri] = useLocalState(["settings-banner-uri", userId], "");

  const [snackbarVisible, setSnackbarVisible] = useLocalState(["settings-sb-visible", userId], false);
  const [snackbarMessage, setSnackbarMessage] = useLocalState(["settings-sb-msg", userId], "");
  const [snackbarType, setSnackbarType] = useLocalState<"info" | "error">(["settings-sb-type", userId], "info");
  const [selectedPickerField, setSelectedPickerField] = useLocalState<"profile" | "banner" | null>(["settings-picker-field", userId], null);

  const showSnackbar = (message: string, type: "info" | "error" = "info") => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const pickImage = async (field: "profile" | "banner", source: "camera" | "gallery") => {
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
          aspect: field === "profile" ? [1, 1] : [16, 9],
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
          aspect: field === "profile" ? [1, 1] : [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedUri = result.assets[0].uri;
        if (field === "profile") {
          setProfileUri(selectedUri);
        } else {
          setBannerUri(selectedUri);
        }
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
      let formattedDob = "";
      if (dobDay || dobMonth || dobYear) {
        const dayNum = Number(dobDay || "0");
        const monthNum = Number(dobMonth || "0");
        const yearNum = Number(dobYear || "0");
        if (!dayNum || dayNum < 1 || dayNum > 31 || !monthNum || monthNum < 1 || monthNum > 12 || !yearNum || yearNum < 1900 || yearNum > new Date().getFullYear()) {
          throw new Error("Please enter a valid Date of Birth");
        }
        const day = dobDay.padStart(2, "0");
        const month = dobMonth.padStart(2, "0");
        const year = dobYear;
        formattedDob = `${year}-${month}-${day}`;
      }

      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("bio", bio);
      formData.append("dob", formattedDob);

      if (profileUri) {
        await appendFileToFormData(formData, "profile", profileUri);
      }

      if (bannerUri) {
        await appendFileToFormData(formData, "banner", bannerUri);
      }

      return apiRequest<TalksyUser>("/users/profile", {
        method: "PUT",
        body: formData,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth-user"], (old: TalksyUser | null) => old ? { ...old, ...data } : data);
      setProfileUri("");
      setBannerUri("");
      showSnackbar("Profile updated successfully!");
    },
    onError: (err: Error) => {
      showSnackbar(err.message || "Failed to update profile", "error");
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("All password fields are required");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }
      if (newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters");
      }
      return apiRequest<{ message: string }>("/users/change-password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSnackbar("Password updated successfully!");
    },
    onError: (err: Error) => {
      showSnackbar(err.message || "Failed to update password", "error");
    },
  });

  const handleLogout = () => {
    setToken(null);
    socketService.disconnect();
    queryClient.setQueryData(["auth-user"], null);
    queryClient.clear();
    router.replace("/(auth)/login");
  };

  const currentProfile = profileUri || user.profile;
  const currentBanner = bannerUri || user.banner;

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
          <SafeBanner uri={currentBanner} style={styles.banner} />

          <View style={styles.bannerEditOverlay}>
            <IconButton icon="pencil" mode="contained" size={20} containerColor="rgba(0,0,0,0.5)" iconColor="#fff" onPress={() => setSelectedPickerField("banner")} />
          </View>

          <View style={[styles.avatarWrapper, { backgroundColor: theme.colors.surface }]}>
            <SafeAvatar uri={currentProfile} name={user.name} size={100} style={styles.avatar} />
            <View style={styles.avatarEditOverlay}>
              <IconButton icon="pencil" mode="contained" size={18} containerColor={theme.colors.primary} iconColor={theme.colors.onPrimary} style={styles.avatarEditBtn} onPress={() => setSelectedPickerField("profile")} />
            </View>
          </View>
        </View>

        <View style={styles.formContainer}>
          <Card style={styles.sectionCard}>
            <Card.Content style={styles.sectionContent}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Account Information
              </Text>

              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Content style={styles.sectionContent}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Personal Details
              </Text>

              <TextInput
                label="Bio"
                value={bio}
                onChangeText={setBio}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Text variant="bodyMedium" style={styles.label}>
                Date of Birth
              </Text>
              <View style={styles.dobRow}>
                <TextInput
                  label="Day (DD)"
                  value={dobDay}
                  onChangeText={setDobDay}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="DD"
                  style={styles.dobInput}
                />
                <TextInput
                  label="Month (MM)"
                  value={dobMonth}
                  onChangeText={setDobMonth}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="MM"
                  style={styles.dobInput}
                />
                <TextInput
                  label="Year (YYYY)"
                  value={dobYear}
                  onChangeText={setDobYear}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  placeholder="YYYY"
                  style={styles.dobYearInput}
                />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Content style={styles.sectionContent}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                Security & Password
              </Text>

              <TextInput
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                mode="outlined"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                mode="outlined"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry
                autoCapitalize="none"
                style={styles.input}
              />

              <Button
                mode="contained-tonal"
                onPress={() => passwordMutation.mutate()}
                loading={passwordMutation.isPending}
                disabled={passwordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                style={styles.actionButton}
              >
                Update Password
              </Button>
            </Card.Content>
          </Card>

          <Button
            mode="contained"
            onPress={() => updateMutation.mutate()}
            loading={updateMutation.isPending}
            disabled={updateMutation.isPending}
            style={styles.saveBtn}
          >
            Save Profile
          </Button>

          <Button
            mode="outlined"
            onPress={handleLogout}
            textColor={theme.colors.error}
            style={[styles.logoutBtn, { borderColor: theme.colors.error }]}
          >
            Logout
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={selectedPickerField !== null} onDismiss={() => setSelectedPickerField(null)} style={{ borderRadius: 16 }}>
          <Dialog.Title>Update {selectedPickerField === "profile" ? "Profile Picture" : "Cover Banner"}</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Take Photo"
              description="Capture image using camera"
              left={(props) => <List.Icon {...props} icon="camera" />}
              onPress={() => {
                if (selectedPickerField) pickImage(selectedPickerField, "camera");
                setSelectedPickerField(null);
              }}
            />
            <Divider />
            <List.Item
              title="Choose from Gallery"
              description="Pick image from media library"
              left={(props) => <List.Icon {...props} icon="image" />}
              onPress={() => {
                if (selectedPickerField) pickImage(selectedPickerField, "gallery");
                setSelectedPickerField(null);
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedPickerField(null)}>Cancel</Button>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  headerContainer: {
    position: "relative",
    height: 180,
    marginBottom: 40,
  },
  banner: {
    height: 140,
  },
  bannerEditOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 4,
  },
  avatarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 20,
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
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
  input: {
    width: "100%",
  },
  label: {
    marginTop: 4,
    opacity: 0.8,
  },
  dobRow: {
    flexDirection: "row",
    gap: 8,
  },
  dobInput: {
    flex: 1,
  },
  dobYearInput: {
    flex: 1.5,
  },
  actionButton: {
    marginTop: 4,
    borderRadius: 8,
  },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtn: {
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});
