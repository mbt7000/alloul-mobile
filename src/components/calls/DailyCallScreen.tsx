import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Image, Platform,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useCallContext } from "../../context/CallContext";

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DailyCallScreen() {
  const { activeCall, hangUp } = useCallContext();

  const [elapsed, setElapsed] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [finalDuration, setFinalDuration] = useState(0);
  const [browserOpen, setBrowserOpen] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const summaryFade = useRef(new Animated.Value(0)).current;

  // Refs to avoid stale closures
  const elapsedRef = useRef(0);
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const hangUpRef = useRef(hangUp);
  hangUpRef.current = hangUp;
  const browserOpenRef = useRef(browserOpen);
  browserOpenRef.current = browserOpen;

  const doHangUp = async (dur: number) => {
    WebBrowser.dismissBrowser();
    setFinalDuration(dur);
    setShowSummary(true);
    Animated.timing(summaryFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    await hangUpRef.current();
    setTimeout(() => {
      setShowSummary(false);
      summaryFade.setValue(0);
    }, 3000);
  };

  const openBrowser = async (url: string) => {
    if (browserOpenRef.current) return;
    setBrowserOpen(true);
    browserOpenRef.current = true;
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: Platform.OS === "ios"
          ? WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN
          : undefined,
        toolbarColor: "#0a0a0f",
        controlsColor: "#0ea5e9",
        showTitle: false,
      });
    } catch {}
    setBrowserOpen(false);
    browserOpenRef.current = false;
    // Browser was dismissed → treat as call ended
    if (activeCallRef.current) {
      await doHangUp(elapsedRef.current);
    }
  };

  // When a new active call starts
  useEffect(() => {
    if (!activeCall) {
      elapsedRef.current = 0;
      setElapsed(0);
      setBrowserOpen(false);
      browserOpenRef.current = false;
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      return;
    }

    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();

    // Start timer
    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);

    // Open Daily.co in system browser (Safari on iOS = full camera/mic access)
    void openBrowser(activeCall.room_url);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.call_id]);

  if (!activeCall && !showSummary) return null;

  const initials = (activeCall?.other_user_name ?? "U").slice(0, 2).toUpperCase();
  const displayName = activeCall?.other_user_name ?? "";
  const displayAvatar = activeCall?.other_user_avatar;

  // ── Call Summary ──────────────────────────────────────────────────
  if (showSummary) {
    return (
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: summaryFade, zIndex: 9998 }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={styles.summaryContainer}>
          <View style={styles.summaryAvatar}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.summaryAvatarImg} />
            ) : (
              <Text style={styles.summaryInitials}>{initials}</Text>
            )}
          </View>
          <Ionicons name="checkmark-circle" size={36} color="#10b981" style={{ marginTop: 16 }} />
          <Text style={styles.summaryTitle}>انتهت المكالمة</Text>
          <Text style={styles.summaryName}>{displayName}</Text>
          <View style={styles.summaryDurationBox}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.summaryDuration}>{formatDuration(finalDuration)}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // ── Mini banner when browser is open ─────────────────────────────
  if (browserOpen) {
    return (
      <Animated.View style={[styles.miniBannerContainer, { opacity: fadeAnim }]} pointerEvents="box-none">
        <View style={styles.miniBanner} pointerEvents="box-none">
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>مكالمة جارية</Text>
          </View>
          <Text style={styles.miniBannerName} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.miniBannerTimer}>{formatDuration(elapsed)}</Text>
        </View>
      </Animated.View>
    );
  }

  // ── Full screen when browser is minimized/closed ──────────────────
  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim, zIndex: 9998 }]}>
      <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFillObject} />

      <View style={styles.fullScreen}>
        {/* Call type tag */}
        <View style={styles.callTypeTag}>
          <Ionicons
            name={activeCall!.call_type === "video" ? "videocam" : "call"}
            size={14}
            color="#0ea5e9"
          />
          <Text style={styles.callTypeText}>
            {activeCall!.call_type === "video" ? "اتصال فيديو" : "اتصال صوتي"}
          </Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing2} />
          <View style={styles.avatarRing1} />
          <View style={styles.mainAvatar}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
        </View>

        <Text style={styles.callerName}>{displayName}</Text>
        <Text style={styles.callDuration}>{formatDuration(elapsed)}</Text>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rejoinBtn}
            onPress={() => void openBrowser(activeCall!.room_url)}
            activeOpacity={0.85}
          >
            <Ionicons name="videocam" size={22} color="#fff" />
            <Text style={styles.rejoinText}>فتح المكالمة</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endBtn}
            onPress={() => void doHangUp(elapsedRef.current)}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  miniBannerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9997,
  },
  miniBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(10,15,25,0.92)",
    borderBottomWidth: 1,
    borderBottomColor: "#0ea5e930",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#10b98118",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#10b98135",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
  },
  liveText: {
    color: "#10b981",
    fontSize: 11,
    fontWeight: "700",
  },
  miniBannerName: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  miniBannerTimer: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "600",
  },
  // Full screen
  fullScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  callTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0ea5e912",
    borderWidth: 1,
    borderColor: "#0ea5e928",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 48,
  },
  callTypeText: {
    color: "#0ea5e9",
    fontSize: 13,
    fontWeight: "600",
  },
  avatarSection: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  avatarRing2: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "#0ea5e912",
  },
  avatarRing1: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: "#0ea5e928",
  },
  mainAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0f2044",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0ea5e9",
    overflow: "hidden",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarInitials: {
    color: "#60a5fa",
    fontSize: 32,
    fontWeight: "800",
  },
  callerName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  callDuration: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    marginTop: 6,
    marginBottom: 48,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  rejoinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 32,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  rejoinText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  endBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  // Summary
  summaryContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  summaryAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#0f2044",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#10b981",
    overflow: "hidden",
  },
  summaryAvatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  summaryInitials: {
    color: "#60a5fa",
    fontSize: 28,
    fontWeight: "800",
  },
  summaryTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  summaryName: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  summaryDurationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    marginTop: 12,
  },
  summaryDuration: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});
