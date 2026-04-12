import React, { useCallback, useState } from "react";
import { Alert, ScrollView, View, Pressable, Image, ActivityIndicator, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import HomeSmartHeader from "../../../shared/components/HomeSmartHeader";
import MediaHomeFeed from "../../../shared/components/MediaHomeFeed";
import UnifiedSearchField from "../../../shared/components/UnifiedSearchField";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useThemedStyles } from "../../../theme/useThemedStyles";
import { addRecentSearch } from "../../../storage/recentSearches";
import { useAuth } from "../../../state/auth/AuthContext";
import { useHomeMode } from "../../../state/mode/HomeModeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import { useNotifications } from "../../../state/notifications/NotificationsContext";
import { ROOT_SHELL_ROUTES } from "../../../config/routes";
import { getStories, groupStoriesByUser, type StoryGroup } from "../../../api/stories.api";

const TAB_BAR_PAD = 100;

const STORY_COLORS = ["#38e8ff", "#a855f7", "#f472b6", "#fb923c", "#2dd36f", "#3b82f6", "#f59e0b"];

function HomeStoriesBar({ currentUserId, navigation }: { currentUserId: number; navigation: any }) {
  const { colors } = useAppTheme();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStories = useCallback(async () => {
    try {
      const stories = await getStories();
      setGroups(groupStoriesByUser(stories, currentUserId));
    } catch {} finally { setLoading(false); }
  }, [currentUserId]);

  useFocusEffect(useCallback(() => { setLoading(true); void loadStories(); }, [loadStories]));

  const hasOwnStory = groups.some(g => g.user_id === currentUserId);

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 8 }}>
        {/* Add story button */}
        {!hasOwnStory && (
          <Pressable style={{ alignItems: "center", width: 66 }} onPress={() => navigation.navigate("CreateStory")}>
            <View style={{ width: 66, height: 66, borderRadius: 22, borderWidth: 2.5, borderColor: colors.accentCyan, padding: 3, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: "100%" as any, height: "100%" as any, borderRadius: 18, borderWidth: 2, borderColor: colors.mediaCanvas ?? "#07091A", padding: 2, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: "100%" as any, height: "100%" as any, borderRadius: 14, backgroundColor: "rgba(56,232,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="add" size={20} color={colors.accentCyan} />
                </View>
              </View>
            </View>
            <AppText variant="micro" tone="primary" numberOfLines={1} style={{ marginTop: 5, textAlign: "center", maxWidth: 66 }}>قصتي</AppText>
          </Pressable>
        )}

        {groups.map((group, idx) => {
          const isOwn = group.user_id === currentUserId;
          const storyColor = group.is_live ? "#ef4444" : STORY_COLORS[idx % STORY_COLORS.length];
          const seen = group.all_seen && !group.is_live;

          return (
            <Pressable
              key={group.user_id}
              style={{ alignItems: "center", width: 66 }}
              onPress={() => isOwn && !hasOwnStory ? navigation.navigate("CreateStory") : navigation.navigate("StoryViewer", { groups, startIndex: idx })}
            >
              <View style={{ width: 66, height: 66, borderRadius: 22, borderWidth: 2.5, borderColor: seen ? colors.border : storyColor, padding: 3, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: "100%" as any, height: "100%" as any, borderRadius: 18, borderWidth: 2, borderColor: seen ? "transparent" : colors.mediaCanvas ?? "#07091A", padding: 2, alignItems: "center", justifyContent: "center" }}>
                  {group.author_avatar ? (
                    <Image source={{ uri: group.author_avatar }} style={{ width: "100%" as any, height: "100%" as any, borderRadius: 14 }} />
                  ) : isOwn ? (
                    <View style={{ width: "100%" as any, height: "100%" as any, borderRadius: 14, backgroundColor: "rgba(56,232,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="add" size={20} color={colors.accentCyan} />
                    </View>
                  ) : (
                    <View style={{ width: "100%" as any, height: "100%" as any, borderRadius: 14, backgroundColor: `${storyColor}22`, alignItems: "center", justifyContent: "center" }}>
                      <AppText variant="bodySm" weight="bold" style={{ color: storyColor }}>{(group.author_name || "U").slice(0, 1)}</AppText>
                    </View>
                  )}
                </View>
              </View>

              {group.is_live && (
                <View style={{ position: "absolute", top: 0, right: -2, flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#ef4444", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6, borderWidth: 1.5, borderColor: colors.mediaCanvas ?? "#0a0a0f" }}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#fff" }} />
                  <Text style={{ color: "#fff", fontSize: 7, fontWeight: "900" }}>LIVE</Text>
                </View>
              )}

              {group.is_news_channel && !group.is_live && (
                <View style={{ position: "absolute", bottom: 18, right: -2, backgroundColor: colors.mediaCanvas ?? "#0a0a0f", borderRadius: 10, padding: 1 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#0ea5e9" />
                </View>
              )}

              <AppText variant="micro" tone={seen ? "muted" : "primary"} numberOfLines={1} style={{ marginTop: 5, textAlign: "center", maxWidth: 66 }}>
                {isOwn ? "قصتي" : group.author_name}
              </AppText>
            </Pressable>
          );
        })}

        {loading && (
          <View style={{ alignItems: "center", justifyContent: "center", width: 66 }}>
            <ActivityIndicator size="small" color={colors.accentCyan} />
          </View>
        )}
      </ScrollView>
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)" }} />
    </View>
  );
}

export default function MediaHomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(() => ({
    glowTop: {
      position: "absolute" as const,
      top: -80,
      left: "15%",
      width: 280,
      height: 200,
      borderRadius: 120,
      backgroundColor: "rgba(76,111,255,0.10)",
      opacity: 0.9,
    },
    glowBlue: {
      position: "absolute" as const,
      top: 40,
      right: -40,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: "rgba(56,232,255,0.06)",
    },
    searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  }));
  const { user } = useAuth();
  const { company, loading: companyLoading } = useCompany();
  const { displayUnreadCount } = useNotifications();
  const { mode, switchMode, canUseCompanyMode, getLastRoute } = useHomeMode();
  const [searchDraft, setSearchDraft] = useState("");
  const firstName = (user?.name || user?.username || "there").split(/\s+/)[0];

  const handleModeChange = useCallback(
    (nextMode: "public" | "company") => {
      const ok = switchMode(nextMode);
      const rootNavigation = navigation.getParent() as
        | {
            navigate: (routeName: string, params?: object) => void;
            replace?: (routeName: string, params?: object) => void;
          }
        | undefined;

      if (!ok && nextMode === "company") {
        Alert.alert("يلزمك وصول إلى الشركات", "تحتاج إلى عضوية شركة فعّالة للدخول إلى تجربة الشركات.");
        rootNavigation?.navigate(ROOT_SHELL_ROUTES.media, {
          screen: "MediaTabs",
          params: { screen: getLastRoute("public") ?? "Feed" },
        });
        return;
      }

      const targetShell = nextMode === "company" ? ROOT_SHELL_ROUTES.company : ROOT_SHELL_ROUTES.media;
      const targetScreen = getLastRoute(nextMode) ?? (nextMode === "company" ? "CompanyWorkspace" : "Feed");
      rootNavigation?.navigate(
        targetShell,
        nextMode === "company"
          ? { screen: targetScreen }
          : { screen: "MediaTabs", params: { screen: targetScreen } }
      );
    },
    [getLastRoute, navigation, switchMode]
  );

  return (
    <Screen style={{ backgroundColor: colors.mediaCanvas }}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBlue} pointerEvents="none" />

      <HomeSmartHeader
        variant="mediaStrip"
        firstName={firstName}
        mode={mode}
        onModeChange={handleModeChange}
        companyName={company?.name}
        companyLoading={companyLoading}
        canUseCompanyMode={canUseCompanyMode}
        onSearch={() => navigation.navigate("Search", { source: "home" })}
        onNotifications={() => navigation.navigate("Inbox")}
        inboxUnreadCount={displayUnreadCount}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: TAB_BAR_PAD }}
      >
        {/* Stories bar */}
        <HomeStoriesBar currentUserId={user?.id ?? 0} navigation={navigation} />

        <View style={styles.searchWrap}>
          <UnifiedSearchField
            value={searchDraft}
            onChangeText={setSearchDraft}
            dense
            placeholder="استكشف المحتوى..."
            onSubmitSearch={() => {
              const q = searchDraft.trim();
              void (async () => {
                if (q) await addRecentSearch(q);
                navigation.navigate("Search", q ? { q, source: "home" } : { source: "home" });
              })();
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <MediaHomeFeed navigation={navigation} />
        </View>
      </ScrollView>
    </Screen>
  );
}
