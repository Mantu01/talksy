import React from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { TextInput, Button, Text, Card, HelperText, Avatar, useTheme, Appbar } from "react-native-paper";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/utils/api";
import { useLocalState } from "@/hooks/use-local-state";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

export default function CreateGroupScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [title, setTitle] = useLocalState("cg-title", "");
  const [description, setDescription] = useLocalState("cg-description", "");
  const [logoUri, setLogoUri] = useLocalState("cg-logo-uri", "");
  const [errorMsg, setErrorMsg] = useLocalState("cg-error", "");

  const pickLogo = async (source: "camera" | "gallery") => {
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
          aspect: [1, 1],
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
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
        setErrorMsg("");
      }
    } catch (err) {
      setErrorMsg("Failed to pick logo");
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

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);

      if (logoUri) {
        await appendFileToFormData(formData, "logo", logoUri);
      }

      return apiRequest<any>("/groups", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joined-groups"] });
      setTitle("");
      setDescription("");
      setLogoUri("");
      setErrorMsg("");
      router.back();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create group");
    },
  });

  const initial = title ? title.charAt(0).toUpperCase() : "G";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Create New Group" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.logoSection}>
              {logoUri ? (
                <Avatar.Image size={80} source={{ uri: logoUri }} />
              ) : (
                <Avatar.Text size={80} label={initial} />
              )}
              <View style={styles.logoButtons}>
                <Button mode="outlined" compact onPress={() => pickLogo("camera")}>
                  Camera
                </Button>
                <Button mode="outlined" compact onPress={() => pickLogo("gallery")}>
                  Gallery
                </Button>
              </View>
            </View>

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

            {errorMsg ? (
              <HelperText type="error" visible={!!errorMsg} style={styles.errorText}>
                {errorMsg}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={mutation.isPending || !title}
              style={styles.btn}
            >
              Create Group
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
  },
  cardContent: {
    gap: 16,
  },
  logoSection: {
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  logoButtons: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    width: "100%",
  },
  btn: {
    marginTop: 8,
    paddingVertical: 4,
  },
  errorText: {
    textAlign: "center",
  },
});
