import React from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { TextInput, Button, Text, Avatar, useTheme, Card, HelperText, ActivityIndicator, IconButton, Portal, Dialog, List, Divider } from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setToken } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { socketService } from "@/utils/socket";

export default function SettingsScreen() {
  const theme = useTheme();
  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["auth-user"],
    queryFn: () => apiRequest("/auth/me").catch(() => null),
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

function SettingsForm({ user }: { user: any }) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const dobParts = user.dob ? user.dob.split("-") : ["", "", ""];
  const initialYear = dobParts[0] || "";
  const initialMonth = dobParts[1] || "";
  const initialDay = dobParts[2] || "";

  const [name, setName] = useLocalState("set-name", user.name);
  const [email, setEmail] = useLocalState("set-email", user.email);
  const [bio, setBio] = useLocalState("set-bio", user.bio || "");
  const [dobDay, setDobDay] = useLocalState("set-dob-day", initialDay);
  const [dobMonth, setDobMonth] = useLocalState("set-dob-month", initialMonth);
  const [dobYear, setDobYear] = useLocalState("set-dob-year", initialYear);

  const [profileUri, setProfileUri] = useLocalState("set-profile-uri", "");
  const [bannerUri, setBannerUri] = useLocalState("set-banner-uri", "");
  const [statusMsg, setStatusMsg] = useLocalState("set-status-msg", "");
  const [errorMsg, setErrorMsg] = useLocalState("set-error-msg", "");
  const [selectedPickerField, setSelectedPickerField] = useLocalState<"profile" | "banner" | null>("settings-picker-field", null);

  const pickImage = async (field: "profile" | "banner", source: "camera" | "gallery") => {
    try {
      let result;
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setErrorMsg("Camera permission is required");
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
          setErrorMsg("Gallery permission is required");
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
        setErrorMsg("");
      }
    } catch (err) {
      setErrorMsg("Failed to pick image");
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
      } as any);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      let formattedDob = "";
      if (dobDay || dobMonth || dobYear) {
        const day = dobDay.padStart(2, "0");
        const month = dobMonth.padStart(2, "0");
        const year = dobYear;
        formattedDob = `${year}-${month}-${day}`;
        const dobDate = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(dobDate.getTime()) || Number(year) < 1900 || Number(year) > new Date().getFullYear()) {
          throw new Error("Please enter a valid Date of Birth");
        }
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

      return apiRequest<any>("/users/profile", {
        method: "PUT",
        body: formData,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth-user"], (old: any) => ({ ...old, ...data }));
      setProfileUri("");
      setBannerUri("");
      setStatusMsg("Profile updated successfully!");
      setErrorMsg("");
      setTimeout(() => setStatusMsg(""), 3000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to update profile");
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContainer}>
        {currentBanner ? (
          <Card.Cover source={{ uri: currentBanner }} style={styles.banner} />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={{ color: theme.colors.onPrimaryContainer }}>No Banner Set</Text>
          </View>
        )}

        <View style={styles.bannerEditOverlay}>
          <IconButton icon="pencil" mode="contained" size={20} containerColor="rgba(0,0,0,0.5)" iconColor="#fff" onPress={() => setSelectedPickerField("banner")} />
        </View>

        <View style={styles.avatarWrapper}>
          {currentProfile ? (
            <Avatar.Image size={100} source={{ uri: currentProfile }} style={styles.avatar} />
          ) : (
            <Avatar.Text size={100} label={user.name ? user.name.charAt(0).toUpperCase() : ""} style={styles.avatar} />
          )}
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

        {statusMsg ? (
          <HelperText type="info" visible={!!statusMsg} style={styles.statusText}>
            {statusMsg}
          </HelperText>
        ) : null}

        {errorMsg ? (
          <HelperText type="error" visible={!!errorMsg} style={styles.errorText}>
            {errorMsg}
          </HelperText>
        ) : null}

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
    </ScrollView>
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
  headerContainer: {
    position: "relative",
    height: 180,
    marginBottom: 40,
  },
  banner: {
    height: 140,
  },
  bannerPlaceholder: {
    height: 140,
    justifyContent: "center",
    alignItems: "center",
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
  statusText: {
    textAlign: "center",
    color: "green",
    fontWeight: "bold",
  },
  errorText: {
    textAlign: "center",
    fontWeight: "bold",
  },
});
