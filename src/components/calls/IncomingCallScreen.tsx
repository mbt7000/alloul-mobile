import React, { useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, Animated, StyleSheet,
  Dimensions, StatusBar, Image,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useCallContext } from "../../context/CallContext";

const { width, height } = Dimensions.get("window");
const TIMEOUT_SEC = 30;

export default function IncomingCallScreen() {
  const { incomingCall, acceptIncoming, rejectIncoming } = useCallContext();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation
  useEffect(() => {
    if (!incomingCall) return;

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim2, { toValue: 1.55, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulseAnim2, { toValue: 1, duration: 1300, useNativeDriver: true }),
      ]),
    ).start();

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    // Haptic rhythm
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    hapticRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 1800);

    // Auto-dismiss after 30s
    timeoutRef.current = setTimeout(() => {
      void rejectIncoming();
    }, TIMEOUT_SEC * 1000);

    return () => {
      pulseAnim.stopAnimation();
      pulseAnim2.stopAnimation();
      if (hapticRef.current) clearInterval(hapticRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [incomingCall?.call_id]);

  if (!incomingCall) return null;

  const callLabel = incomingCall.call_type === "video" ? "اتصال فيديو وارد" : "اتصال صوتي وارد";
  const initials = (incomingCall.caller_name || "U").slice(0, 2).toUpperCase();

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim, zIndex: 9999 }]}>
      <StatusBar barStyle="light-content" />
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFillObject} />

      {/* Dark gradient overlay */}
      <View style={styles.overlay} />

      <View style={styles.container}>
        {/* Call type label */}
        <View style={styles.callTypeBadge}>
          <Ionicons
            name={incomingCall.call_type === "video" ? "videocam" : "call"}
            size={14}
            color="#fff"
          />
          <Text style={styles.callTypeText}>{callLabel}</Text>
        </View>

        {/* Avatar with pulse rings */}
        <View style={styles.avatarContainer}>
          <Animated.View style={[styles.pulseRing2, { transform: [{ scale: pulseAnim2 }] }]} />
          <Animated.View style={[styles.pulseRing1, { transform: [{ scale: pulseAnim }] }]} />

          <View style={styles.avatarCircle}>
            {incomingCall.caller_avatar ? (
              <Image
                source={{ uri: incomingCall.caller_avatar }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
        </View>

        {/* Caller name */}
        <Text style={styles.callerName}>{incomingCall.caller_name}</Text>
        <Text style={styles.callerSubtitle}>يتصل بك الآن...</Text>

        {/* Action buttons */}
        <View style={styles.buttonsRow}>
          {/* Reject */}
          <View style={styles.btnWrapper}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                void rejectIncoming();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>رفض</Text>
          </View>

          {/* Accept */}
          <View style={styles.btnWrapper}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                void acceptIncoming();
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={incomingCall.call_type === "video" ? "videocam" : "call"}
                size={30}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.btnLabel}>قبول</Text>
          </View>
        </View>

        {/* Mute answer */}
        <TouchableOpacity
          style={styles.muteBtn}
          onPress={() => void rejectIncoming()}
          activeOpacity={0.7}
        >
          <Text style={styles.muteBtnText}>رد بدون صوت</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,5,15,0.75)",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  callTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 40,
  },
  callTypeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  pulseRing1: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(16,185,129,0.18)",
    borderWidth: 2,
    borderColor: "rgba(16,185,129,0.3)",
  },
  pulseRing2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.15)",
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#1e3a5f",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#10b981",
    overflow: "hidden",
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarInitials: {
    color: "#60a5fa",
    fontSize: 36,
    fontWeight: "800",
  },
  callerName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  callerSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 15,
    marginBottom: 60,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 60,
    marginBottom: 28,
  },
  btnWrapper: {
    alignItems: "center",
    gap: 10,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  rejectBtn: {
    backgroundColor: "#ef4444",
    shadowColor: "#ef4444",
  },
  acceptBtn: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
  },
  btnLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
  },
  muteBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  muteBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
});
