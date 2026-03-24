import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../theme/colors";

/**
 * Tab placeholder: tab press is intercepted in WorkspaceTabBar to open Media feed.
 * If user lands here (deep link), redirect to Media.
 */
export default function MediaBridgeScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    const t = setTimeout(() => {
      const parent = navigation.getParent() as { navigate: (n: string, p?: object) => void } | undefined;
      parent?.navigate("MediaTabs", { screen: "Feed" });
    }, 0);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={colors.accentCyan} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
