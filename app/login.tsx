import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import {
  createUserWithEmailAndPassword,
  PhoneAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth, db, firebaseConfig } from "../config/firebaseConfig";
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
  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [verificationId, setVerificationId] = useState("");
  const otpRefs = useRef<any[]>([]);
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const getAuthErrorMessage = (error: any) => {
    const code = error?.code ?? "";
    if (code === "auth/operation-not-allowed") {
      return (
        "Phone authentication is disabled in Firebase.\n\n" +
        "Enable it in Firebase Console: Authentication → Sign-in method → Phone."
      );
    }
    if (code === "auth/invalid-phone-number") {
      return "Please enter a valid mobile number.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many attempts. Please wait and try again later.";
    }
    return error?.message || "Authentication failed. Please try again.";
  };

  const handlePostAuthRouting = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication failed.");
  }

  // 1. Check Firestore for this SPECIFIC user document
  const userDocRef = doc(db, "users", currentUser.uid);
  const profileDoc = await getDoc(userDocRef);

  if (profileDoc.exists()) {
    // Existing user found -> Go to App
    await AsyncStorage.setItem("isLoggedIn", "true");
    router.replace("/(tabs)");
  } else {
    // New user (Email or Phone) -> Must go to onboarding
    await AsyncStorage.setItem("isLoggedIn", "false"); // Ensure they aren't marked logged in yet
    router.replace("/onboarding");
  }
};

  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

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

  const sendOTP = async () => {
    if (phone.length !== 10) {
      Alert.alert("Invalid number", "Please enter a valid 10-digit number.");
      return;
    }
    setLoading(true);
    try {
      if (!recaptchaVerifier.current) {
        throw new Error("reCAPTCHA is not ready. Please try again.");
      }
      const phoneProvider = new PhoneAuthProvider(auth);
      const id = await phoneProvider.verifyPhoneNumber(
        `+91${phone}`,
        recaptchaVerifier.current
      );
      setVerificationId(id);
      setTimer(30);
      animateTransition(() => setStep("otp"));
    } catch (error: any) {
      setVerificationId("");
      Alert.alert("OTP send failed", getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  };

  const verifyOTP = async () => {
    if (otp.join("").length !== 6) {
      Alert.alert("Incomplete", "Please enter all 6 digits.");
      return;
    }
    setLoading(true);
    try {
      if (!verificationId) throw new Error("No OTP confirmation found.");
      
      const credential = PhoneAuthProvider.credential(verificationId, otp.join(""));
      await signInWithCredential(auth, credential);
      await handlePostAuthRouting();
    } catch (error: any) {
      Alert.alert("Verification failed", getAuthErrorMessage(error));
    } finally {
      setLoading(false);
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
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      await handlePostAuthRouting();
    } catch (error: any) {
      Alert.alert(isSignup ? "Sign up failed" : "Sign in failed", getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.topAccent} />
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          {step === "otp" && (
            <TouchableOpacity onPress={() => animateTransition(() => {
                setStep("phone");
                setOtp(["", "", "", "", "", ""]);
                setVerificationId("");
            })}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.logoSmall}>
            <View style={styles.barS1} />
            <View style={styles.barS2} />
            <View style={styles.barS3} />
          </View>
          <Text style={styles.logoText}>FitGuru</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {authMode === "phone" ? (step === "phone" ? "Welcome" : "Verify number") : "Welcome"}
          </Text>
          <Text style={styles.cardSub}>
            {authMode === "phone"
              ? step === "phone" ? "Enter your mobile number to get started" : `We sent a code to +91 ${phone}`
              : isSignup ? "Create your account" : "Sign in to your account"}
          </Text>

          <View style={styles.modeTabs}>
            <TouchableOpacity
              style={[styles.modeTab, authMode === "phone" && styles.modeTabActive]}
              onPress={() => { setAuthMode("phone"); setStep("phone"); }}
            >
              <Text style={[styles.modeTabText, authMode === "phone" && styles.modeTabTextActive]}>Phone OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, authMode === "email" && styles.modeTabActive]}
              onPress={() => setAuthMode("email")}
            >
              <Text style={[styles.modeTabText, authMode === "email" && styles.modeTabTextActive]}>Email</Text>
            </TouchableOpacity>
          </View>

          {authMode === "phone" && step === "phone" ? (
            <>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.flagText}>🇮🇳</Text>
                  <Text style={styles.codeText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#444"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                />
              </View>
              <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={sendOTP} disabled={loading}>
                {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.primaryBtnText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : authMode === "phone" ? (
            <>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={r => { otpRefs.current[i] = r; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v.slice(-1), i)}
                    onKeyPress={(e) => handleOtpKeyPress(e, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>
              <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={verifyOTP} disabled={loading}>
                {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.primaryBtnText}>Verify & Continue</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => timer === 0 && sendOTP()}>
                <Text style={[styles.resendText, timer > 0 && styles.resendDisabled]}>
                  {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#444" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#444" secureTextEntry value={password} onChangeText={setPassword} />
              <TouchableOpacity style={[styles.primaryBtn, loading && styles.btnDisabled]} onPress={signInWithEmail} disabled={loading}>
                {loading ? <ActivityIndicator color="#0a0a0a" /> : <Text style={styles.primaryBtnText}>{isSignup ? "Create account" : "Sign in"}</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsSignup(!isSignup)} style={styles.switchModeBtn}>
                <Text style={styles.switchModeText}>{isSignup ? "Already have an account? Sign in" : "New user? Create an account"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ</Text>
          <Text style={styles.infoText}>After signing up, your account needs admin approval before you can access the app.</Text>
        </View>
      </Animated.View>
      <FirebaseRecaptchaVerifierModal ref={recaptchaVerifier} firebaseConfig={firebaseConfig} attemptInvisibleVerification />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  topAccent: { height: 3, backgroundColor: "#3dbf3d" },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 40, gap: 10 },
  backArrow: { color: "#3dbf3d", fontSize: 22, marginRight: 4 },
  logoSmall: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  barS1: { width: 5, height: 14, backgroundColor: "#2d9e2d", borderRadius: 2 },
  barS2: { width: 5, height: 22, backgroundColor: "#3dbf3d", borderRadius: 2 },
  barS3: { width: 5, height: 18, backgroundColor: "#2d9e2d", borderRadius: 2 },
  logoText: { fontSize: 22, fontWeight: "700", color: "#f0f0f0", letterSpacing: -0.5 },
  card: { backgroundColor: "#111", borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: "#222", marginBottom: 20 },
  cardTitle: { fontSize: 26, fontWeight: "700", color: "#f0f0f0", marginBottom: 6 },
  cardSub: { fontSize: 14, color: "#666", marginBottom: 28, lineHeight: 22 },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  countryCode: { flexDirection: "row", alignItems: "center", backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 14, borderWidth: 0.5, borderColor: "#2a2a2a", gap: 6 },
  flagText: { fontSize: 16 },
  codeText: { color: "#bbb", fontSize: 15, fontWeight: "500" },
  phoneInput: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#f0f0f0", fontSize: 16, borderWidth: 0.5, borderColor: "#2a2a2a" },
  input: { backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: "#f0f0f0", fontSize: 16, borderWidth: 0.5, borderColor: "#2a2a2a", marginBottom: 12 },
  modeTabs: { flexDirection: "row", backgroundColor: "#0f0f0f", borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 0.5, borderColor: "#222" },
  modeTab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  modeTabActive: { backgroundColor: "#1a2e1a" },
  modeTabText: { color: "#666", fontSize: 13, fontWeight: "600" },
  modeTabTextActive: { color: "#3dbf3d" },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  otpBox: { width: 46, height: 56, backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 0.5, borderColor: "#2a2a2a", color: "#f0f0f0", fontSize: 22, fontWeight: "700" },
  otpBoxFilled: { borderColor: "#3dbf3d", backgroundColor: "#0d1f0d" },
  primaryBtn: { backgroundColor: "#3dbf3d", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#0a0a0a", fontSize: 16, fontWeight: "700" },
  switchModeBtn: { alignItems: "center", paddingTop: 6 },
  switchModeText: { color: "#3dbf3d", fontSize: 13, fontWeight: "500" },
  resendText: { color: "#3dbf3d", fontSize: 14, textAlign: "center", fontWeight: "500" },
  resendDisabled: { color: "#444" },
  infoBox: { flexDirection: "row", gap: 10, backgroundColor: "#111", borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: "#1e2e1e" },
  infoIcon: { color: "#3dbf3d", fontSize: 14 },
  infoText: { flex: 1, fontSize: 12, color: "#555", lineHeight: 18 },
});
