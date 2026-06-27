import React from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { TextInput, Button, Text, Card, HelperText, useTheme } from "react-native-paper";
import { router, Link } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, setToken } from "@/utils/api";
import { socketService } from "@/utils/socket";
import { useLocalState } from "@/hooks/use-local-state";
import { AuthResponse } from "@/types/domain";

export default function LoginScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [email, setEmail] = useLocalState("login-email", "");
  const [password, setPassword] = useLocalState("login-password", "");
  const [errorMsg, setErrorMsg] = useLocalState("login-error", "");

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(["auth-user"], data.user);
      socketService.connect();
      setEmail("");
      setPassword("");
      setErrorMsg("");
      router.replace("/");
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Login failed");
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.innerContainer}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
              Welcome back to Talksy
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Sign in to stay connected with your friends
            </Text>

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              autoCapitalize="none"
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
              disabled={mutation.isPending}
              style={styles.button}
            >
              Sign In
            </Button>

            <View style={styles.footer}>
              <Text variant="bodyMedium">Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <Text style={{ color: theme.colors.primary, fontWeight: "bold" }}>Sign Up</Text>
              </Link>
            </View>
          </Card.Content>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  innerContainer: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    borderRadius: 16,
    elevation: 4,
  },
  cardContent: {
    paddingVertical: 24,
    gap: 16,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 8,
    opacity: 0.7,
  },
  input: {
    width: "100%",
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorText: {
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
});
