import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { getUserPresence } from "../../api/calls.api";

const PRESENCE_COLORS: Record<string, string> = {
  online:  "#10b981",
  away:    "#f59e0b",
  busy:    "#ef4444",
  offline: "#6b7280",
};

interface Props {
  userId: number;
  size?: number;
  borderColor?: string;
  /** Pass status directly to skip API fetch */
  status?: string;
}

export default function UserPresenceIndicator({ userId, size = 12, borderColor = "#000", status }: Props) {
  const [presenceStatus, setPresenceStatus] = useState<string>(status || "offline");

  useEffect(() => {
    if (status) { setPresenceStatus(status); return; }
    void getUserPresence(userId)
      .then((r) => setPresenceStatus(r.presence_status))
      .catch(() => setPresenceStatus("offline"));
  }, [userId, status]);

  const color = PRESENCE_COLORS[presenceStatus] ?? PRESENCE_COLORS.offline;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: size > 10 ? 2 : 1.5,
          borderColor,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
});
