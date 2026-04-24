import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpRefs = useRef<any[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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
    await new Promise((res) => setTimeout(res, 1200)); // replace with Firebase
    setLoading(false);
    setTimer(30);
    animateTransition(() => setStep("otp"));
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
    await new Promise((res) => setTimeout(res, 1000)); // replace with Firebase
    setLoading(false);
    router.replace("/onboarding");
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
            <TouchableOpacity
              onPress={() => animateTransition(() => setStep("phone"))}
            >
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
            {step === "phone" ? "Welcome" : "Verify number"}
          </Text>
          <Text style={styles.cardSub}>
            {step === "phone"
              ? "Enter your mobile number to get started"
              : `We sent a 6-digit code to\n+91 ${phone}`}
          </Text>

          {step === "phone" ? (
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
                  onChangeText={(t) =>
                    setPhone(t.replace(/\D/g, "").slice(0, 10))
                  }
                  maxLength={10}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={sendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0a0a0a" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send OTP</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.disclaimer}>
                By continuing you agree to our Terms &amp; Privacy Policy.
              </Text>
            </>
          ) : (
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
                    selectionColor="#3dbf3d"
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={verifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0a0a0a" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    Verify &amp; Continue
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (timer === 0) {
                    setOtp(["", "", "", "", "", ""]);
                    sendOTP();
                  }
                }}
              >
                <Text
                  style={[
                    styles.resendText,
                    timer > 0 && styles.resendDisabled,
                  ]}
                >
                  {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
    gap: 10,
  },
  backArrow: { color: "#3dbf3d", fontSize: 22, marginRight: 4 },
  logoSmall: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  barS1: { width: 5, height: 14, backgroundColor: "#2d9e2d", borderRadius: 2 },
  barS2: { width: 5, height: 22, backgroundColor: "#3dbf3d", borderRadius: 2 },
  barS3: { width: 5, height: 18, backgroundColor: "#2d9e2d", borderRadius: 2 },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f0f0f0",
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: "#111",
    borderRadius: 20,
    padding: 24,
    borderWidth: 0.5,
    borderColor: "#222",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#f0f0f0",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardSub: { fontSize: 14, color: "#666", marginBottom: 28, lineHeight: 22 },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    gap: 6,
  },
  flagText: { fontSize: 16 },
  codeText: { color: "#bbb", fontSize: 15, fontWeight: "500" },
  phoneInput: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f0f0f0",
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    color: "#f0f0f0",
    fontSize: 22,
    fontWeight: "700",
  },
  otpBoxFilled: { borderColor: "#3dbf3d", backgroundColor: "#0d1f0d" },
  primaryBtn: {
    backgroundColor: "#3dbf3d",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: "#0a0a0a",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: 11,
    color: "#333",
    textAlign: "center",
    lineHeight: 16,
  },
  resendText: {
    color: "#3dbf3d",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  resendDisabled: { color: "#444" },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "#1e2e1e",
    alignItems: "flex-start",
  },
  infoIcon: { color: "#3dbf3d", fontSize: 14, marginTop: 1 },
  infoText: { flex: 1, fontSize: 12, color: "#555", lineHeight: 18 },
});
