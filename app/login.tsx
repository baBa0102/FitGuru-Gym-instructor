import { router } from "expo-router";
import React, { useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import { auth, db } from "../config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const getAuthErrorMessage = (error: any) => {
    const code = error?.code ?? "";
    switch (code) {
      case "auth/invalid-credential": return "Invalid credentials. Please check your email and password.";
      case "auth/user-not-found": return "No account found for this email.";
      case "auth/wrong-password": return "Incorrect password. Please try again.";
      case "auth/email-already-in-use": return "This email is already registered.";
      case "auth/invalid-email": return "Please enter a valid email address.";
      case "auth/weak-password": return "Password should be at least 6 characters long.";
      case "auth/too-many-requests": return "Too many attempts. Please try again later.";
      default: return error?.message || "Authentication failed.";
    }
  };

  // PASS THE USER OBJECT DIRECTLY to avoid auth.currentUser being null temporarily
  // Remove any parameters from the parentheses ()
const handlePostAuthRouting = async () => { 
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new Error("Authentication failed.");
  }

  const userDocRef = doc(db, "users", currentUser.uid);
  const profileDoc = await getDoc(userDocRef);

  if (profileDoc.exists()) {
    await AsyncStorage.setItem("isLoggedIn", "true");
    router.replace("/(tabs)");
  } else {
    // This ensures new users always hit onboarding
    await AsyncStorage.setItem("isLoggedIn", "false"); 
    router.replace("/onboarding");
  }
};

  const signInWithEmail = async () => {
  if (!email.trim() || !password.trim()) {
    Alert.alert("Missing credentials", "Please enter email and password.");
    return;
  }
  setLoading(true);
  try {
    if (isSignup) {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      // SUCCESS: Firebase automatically logs the user in here.
      // handlePostAuthRouting will now see NO firestore doc and send to onboarding.
    } else {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    }
    await handlePostAuthRouting();
  } catch (error: any) {
    console.error("Auth Error:", error); // This is what showed up in your console
    Alert.alert("Auth Error", getAuthErrorMessage(error));
  } finally {
    setLoading(false);
  }
};

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topAccent} />
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.logoSmall}>
            <View style={styles.barS1} />
            <View style={styles.barS2} />
            <View style={styles.barS3} />
          </View>
          <Text style={styles.logoText}>FitGuru</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome</Text>
          <Text style={styles.cardSub}>
            {isSignup ? "Create your account" : "Sign in to your account"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isSignup ? "Create account" : "Sign in"}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => animateTransition(() => setIsSignup((prev) => !prev))}
            style={styles.switchModeBtn}
          >
            <Text style={styles.switchModeText}>
              {isSignup
                ? "Already have an account? Sign in"
                : "New user? Create an account"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ</Text>
          <Text style={styles.infoText}>
            After signing up, your account needs admin approval before you can
            access the app.
          </Text>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  topAccent: { height: 3, backgroundColor: "#3dbf3d" },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 40, gap: 10 },
  logoSmall: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  barS1: { width: 5, height: 14, backgroundColor: "#2d9e2d", borderRadius: 2 },
  barS2: { width: 5, height: 22, backgroundColor: "#3dbf3d", borderRadius: 2 },
  barS3: { width: 5, height: 18, backgroundColor: "#2d9e2d", borderRadius: 2 },
  logoText: { fontSize: 22, fontWeight: "700", color: "#f0f0f0", letterSpacing: -0.5 },
  card: { backgroundColor: "#111", borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: "#222", marginBottom: 20 },
  cardTitle: { fontSize: 26, fontWeight: "700", color: "#f0f0f0", marginBottom: 6 },
  cardSub: { fontSize: 14, color: "#666", marginBottom: 16, lineHeight: 22 },
  input: { backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#f0f0f0", fontSize: 16, borderWidth: 0.5, borderColor: "#2a2a2a", marginBottom: 12 },
  primaryBtn: { backgroundColor: "#3dbf3d", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#0a0a0a", fontSize: 16, fontWeight: "700" },
  switchModeBtn: { alignItems: "center", paddingTop: 6 },
  switchModeText: { color: "#3dbf3d", fontSize: 13, fontWeight: "500" },
  infoBox: { flexDirection: "row", gap: 10, backgroundColor: "#111", borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: "#1e2e1e" },
  infoIcon: { color: "#3dbf3d", fontSize: 14 },
  infoText: { flex: 1, fontSize: 12, color: "#555", lineHeight: 18 },
});
