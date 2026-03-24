import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator, DrawerContentScrollView } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/AuthContext";
import { useCompany } from "../lib/CompanyContext";
import { colors } from "../theme/colors";

// ── Screens ──
import FeedScreen from "../screens/media/FeedScreen";
import ExploreScreen from "../screens/media/ExploreScreen";
import NotificationsScreen from "../screens/shared/NotificationsScreen";
import ProfileScreen from "../screens/shared/ProfileScreen";
import WorkHomeScreen from "../screens/workspace/WorkHomeScreen";
import ApprovalsScreen from "../screens/workspace/ApprovalsScreen";
import ServicesHubScreen from "../screens/workspace/ServicesHubScreen";
import MediaBridgeScreen from "../screens/workspace/MediaBridgeScreen";
import TeamScreen from "../screens/workspace/TeamScreen";
import ProjectsScreen from "../screens/workspace/ProjectsScreen";
import HandoverScreen from "../screens/workspace/HandoverScreen";
import DealsScreen from "../screens/workspace/DealsScreen";
import WorkspaceAdsScreen from "../screens/workspace/WorkspaceAdsScreen";
import MeetingsInfoScreen from "../screens/workspace/MeetingsInfoScreen";
import AiAssistantScreen from "../screens/workspace/AiAssistantScreen";
import SavedPostsScreen from "../screens/media/SavedPostsScreen";
import CommunitiesScreen from "../screens/media/CommunitiesScreen";
import MarketplaceScreen from "../screens/media/MarketplaceScreen";
import SettingsScreen from "../screens/shared/SettingsScreen";
import InfoPlaceholderScreen from "../screens/shared/InfoPlaceholderScreen";
import WorkspaceTabBar from "./WorkspaceTabBar";

// ── Types ──
type AppMode = "media" | "workspace";

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// ═══════════════════════════════════════════════════════════
// Bottom Tabs — 4 tabs at bottom
// ═══════════════════════════════════════════════════════════

function MediaTabs() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarLabel:
          route.name === "Feed"
            ? t("tabs.home")
            : route.name === "Explore"
              ? t("tabs.explore")
              : route.name === "Notifications"
                ? t("tabs.notifications")
                : t("tabs.profile"),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "Feed") iconName = focused ? "home" : "home-outline";
          else if (route.name === "Explore") iconName = focused ? "compass" : "compass-outline";
          else if (route.name === "Notifications") iconName = focused ? "notifications" : "notifications-outline";
          else if (route.name === "Profile") iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/** Workspace bottom bar: Home · Inbox · Apps · Media · Menu (inspired by enterprise hubs, Alloul-branded). */
function WorkspaceTabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      tabBar={(props) => <WorkspaceTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel:
          route.name === "WorkHome"
            ? t("tabs.workHome")
            : route.name === "Approvals"
              ? t("tabs.inbox")
              : route.name === "Services"
                ? t("tabs.apps")
                : route.name === "MediaBridge"
                  ? t("tabs.media")
                  : t("tabs.menu"),
      })}
    >
      <Tab.Screen name="WorkHome" component={WorkHomeScreen} />
      <Tab.Screen name="Approvals" component={ApprovalsScreen} />
      <Tab.Screen name="Services" component={ServicesHubScreen} />
      <Tab.Screen name="MediaBridge" component={MediaBridgeScreen} />
      <Tab.Screen name="More" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function WorkspaceStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkspaceMain" component={WorkspaceTabNavigator} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="Handover" component={HandoverScreen} />
      <Stack.Screen name="Deals" component={DealsScreen} />
      <Stack.Screen name="MeetingsInfo" component={MeetingsInfoScreen} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} />
      <Stack.Screen name="WorkspaceAds" component={WorkspaceAdsScreen} />
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════
// Drawer — swipe from left (like X/Twitter)
// ═══════════════════════════════════════════════════════════

function DrawerContent(props: any) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { company, isMember, isActive } = useCompany();
  const [mode, setMode] = React.useState<AppMode>("media");

  const initials = (user?.name || user?.username || "U").slice(0, 2).toUpperCase();

  const mediaItems: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    {
      key: "mHome",
      label: t("drawer.mHome"),
      icon: "home-outline",
      onPress: () => {
        setMode("media");
        props.navigation.navigate("MediaTabs", { screen: "Feed" });
      },
    },
    {
      key: "mExplore",
      label: t("drawer.mExplore"),
      icon: "compass-outline",
      onPress: () => {
        setMode("media");
        props.navigation.navigate("MediaTabs", { screen: "Explore" });
      },
    },
    {
      key: "mCommunities",
      label: t("drawer.mCommunities"),
      icon: "people-outline",
      onPress: () => {
        setMode("media");
        props.navigation.navigate("CommunitiesList");
      },
    },
    {
      key: "mJobs",
      label: t("drawer.mJobs"),
      icon: "briefcase-outline",
      onPress: () => {
        setMode("media");
        props.navigation.navigate("Jobs");
      },
    },
    {
      key: "mMarketplace",
      label: t("drawer.mMarketplace"),
      icon: "storefront-outline",
      onPress: () => {
        setMode("media");
        props.navigation.navigate("MarketplaceList");
      },
    },
    {
      key: "mMessages",
      label: t("drawer.mMessages"),
      icon: "chatbubble-outline",
      onPress: () => {
        setMode("media");
        props.navigation.navigate("MessagesHub");
      },
    },
    {
      key: "mSaved",
      label: t("drawer.mSaved"),
      icon: "bookmark-outline",
      onPress: () => {
        setMode("media");
        props.navigation.navigate("SavedFeed");
      },
    },
  ];

  const goWorkspace = (params?: { screen: string; params?: object }) => {
    if (params) props.navigation.navigate("WorkspaceTabs" as never, params as never);
    else props.navigation.navigate("WorkspaceTabs" as never);
  };

  const workspaceItems: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      key: "wHome",
      label: t("drawer.wHome"),
      icon: "home-outline",
      onPress: () =>
        goWorkspace({
          screen: "WorkspaceMain",
          params: { screen: "WorkHome" },
        }),
    },
    {
      key: "wApprovals",
      label: t("drawer.wApprovals"),
      icon: "mail-outline",
      onPress: () =>
        goWorkspace({
          screen: "WorkspaceMain",
          params: { screen: "Approvals" },
        }),
    },
    {
      key: "wServices",
      label: t("drawer.wServices"),
      icon: "apps-outline",
      onPress: () =>
        goWorkspace({
          screen: "WorkspaceMain",
          params: { screen: "Services" },
        }),
    },
    { key: "wTeam", label: t("drawer.wTeam"), icon: "people-outline", onPress: () => goWorkspace({ screen: "Team" }) },
    { key: "wProjects", label: t("drawer.wProjects"), icon: "folder-outline", onPress: () => goWorkspace({ screen: "Projects" }) },
    { key: "wHandover", label: t("drawer.wHandover"), icon: "swap-horizontal-outline", onPress: () => goWorkspace({ screen: "Handover" }) },
    { key: "wDeals", label: t("drawer.wDeals"), icon: "card-outline", onPress: () => goWorkspace({ screen: "Deals" }) },
    { key: "wMeetings", label: t("drawer.wMeetings"), icon: "videocam-outline", onPress: () => goWorkspace({ screen: "MeetingsInfo" }) },
    { key: "wAi", label: t("drawer.wAi"), icon: "sparkles-outline", onPress: () => goWorkspace({ screen: "AiAssistant" }) },
    { key: "wAds", label: t("drawer.wAds"), icon: "megaphone-outline", onPress: () => goWorkspace({ screen: "WorkspaceAds" }) },
  ];

  const items = mode === "media" ? mediaItems : workspaceItems;

  return (
    <DrawerContentScrollView {...props} style={styles.drawer} contentContainerStyle={{ flex: 1 }}>
      {/* User header */}
      <View style={styles.drawerHeader}>
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.drawerAvatar} />
        ) : (
          <View style={styles.drawerAvatarFallback}>
            <Text style={styles.drawerInitials}>{initials}</Text>
          </View>
        )}
        <Text style={styles.drawerName}>{user?.name || user?.username || "User"}</Text>
        <Text style={styles.drawerUsername}>@{user?.username}</Text>
        {user?.i_code && (
          <View style={styles.iCodeBadge}>
            <Text style={styles.iCodeText}>#{user.i_code}</Text>
          </View>
        )}
        <View style={styles.statsRow}>
          <Text style={styles.statNum}>{user?.followers_count ?? 0}</Text>
          <Text style={styles.statLabel}> {t("drawer.followers")}  </Text>
          <Text style={styles.statNum}>{user?.following_count ?? 0}</Text>
          <Text style={styles.statLabel}> {t("drawer.following")}</Text>
        </View>
      </View>

      {/* World Switcher */}
      <View style={styles.switcherContainer}>
        <TouchableOpacity
          style={[styles.switcherBtn, mode === "media" && styles.switcherBtnActive]}
          onPress={() => { setMode("media"); props.navigation.navigate("MediaTabs"); }}
        >
          <Ionicons name="radio-outline" size={16} color={mode === "media" ? colors.accent : colors.textMuted} />
          <Text style={[styles.switcherText, mode === "media" && { color: colors.accent, fontWeight: "700" }]}>{t("drawer.media")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.switcherBtn, mode === "workspace" && styles.switcherBtnActiveGreen]}
          onPress={() => {
            if (isMember && isActive) {
              setMode("workspace");
              props.navigation.navigate("WorkspaceTabs");
            } else {
              // TODO: navigate to pricing/subscription
            }
          }}
        >
          <Ionicons name="business-outline" size={16} color={mode === "workspace" ? colors.accentEmerald : colors.textMuted} />
          <Text style={[styles.switcherText, mode === "workspace" && { color: colors.accentEmerald, fontWeight: "700" }]}>
            {isMember ? (company?.name || t("drawer.workspace")) : t("drawer.enterprise")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Company badge */}
      {mode === "workspace" && company && (
        <View style={styles.companyBadge}>
          <Ionicons name="business" size={14} color={colors.accentEmerald} />
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.saasLabel}>{t("drawer.saas")}</Text>
        </View>
      )}

      {/* Nav items */}
      <View style={styles.navSection}>
        <Text style={styles.navSectionTitle}>{mode === "media" ? t("drawer.sectionMedia") : t("drawer.sectionWorkspace")}</Text>
        {items.map((item) => (
          <TouchableOpacity key={item.key} style={styles.navItem} onPress={() => item.onPress()}>
            <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom */}
      <View style={styles.drawerBottom}>
        <TouchableOpacity style={styles.navItem} onPress={() => props.navigation.navigate("Settings")}>
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.navLabel}>{t("drawer.settings")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.accentRose} />
          <Text style={[styles.navLabel, { color: colors.accentRose }]}>{t("drawer.signOut")}</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// ═══════════════════════════════════════════════════════════
// Main App Navigator
// ═══════════════════════════════════════════════════════════

export default function AppNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        drawerStyle: { width: 300, backgroundColor: colors.bg },
        overlayColor: "rgba(0,0,0,0.6)",
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="MediaTabs" component={MediaTabs} />
      <Drawer.Screen name="WorkspaceTabs" component={WorkspaceStackNavigator} />
      <Drawer.Screen name="SavedFeed" component={SavedPostsScreen} />
      <Drawer.Screen name="CommunitiesList" component={CommunitiesScreen} />
      <Drawer.Screen name="MarketplaceList" component={MarketplaceScreen} />
      <Drawer.Screen name="Jobs" component={InfoPlaceholderScreen} initialParams={{ titleKey: "jobs.title", bodyKey: "jobs.body" }} />
      <Drawer.Screen name="MessagesHub" component={InfoPlaceholderScreen} initialParams={{ titleKey: "messages.title", bodyKey: "messages.body" }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg,
    borderTopColor: colors.border,
    borderTopWidth: 0.5,
    height: 85,
    paddingBottom: 25,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  drawer: { backgroundColor: colors.bg },
  drawerHeader: { padding: 20, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  drawerAvatar: { width: 56, height: 56, borderRadius: 16, marginBottom: 12 },
  drawerAvatarFallback: {
    width: 56, height: 56, borderRadius: 16, marginBottom: 12,
    backgroundColor: colors.accent, alignItems: "center", justifyContent: "center",
  },
  drawerInitials: { color: colors.white, fontSize: 20, fontWeight: "900" },
  drawerName: { color: colors.textPrimary, fontSize: 18, fontWeight: "800" },
  drawerUsername: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  iCodeBadge: {
    marginTop: 8, alignSelf: "flex-start",
    backgroundColor: "rgba(124,58,237,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  iCodeText: { color: colors.accent, fontSize: 12, fontWeight: "700", fontFamily: "monospace" },
  statsRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  statNum: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  statLabel: { color: colors.textMuted, fontSize: 13 },
  switcherContainer: {
    flexDirection: "row", margin: 16, padding: 4,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16,
    borderWidth: 0.5, borderColor: colors.border,
  },
  switcherBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 12, gap: 6,
  },
  switcherBtnActive: { backgroundColor: "rgba(124,58,237,0.12)" },
  switcherBtnActiveGreen: { backgroundColor: "rgba(16,185,129,0.12)" },
  switcherText: { fontSize: 13, color: colors.textMuted, fontWeight: "500" },
  companyBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 12,
    backgroundColor: "rgba(16,185,129,0.06)", borderWidth: 0.5, borderColor: "rgba(16,185,129,0.15)",
  },
  companyName: { flex: 1, color: colors.accentEmerald, fontSize: 12, fontWeight: "700" },
  saasLabel: { color: "rgba(16,185,129,0.5)", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  navSection: { flex: 1, paddingTop: 8 },
  navSectionTitle: {
    color: colors.textMuted, fontSize: 10, fontWeight: "800",
    letterSpacing: 1.5, paddingHorizontal: 20, paddingVertical: 8,
  },
  navItem: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  navLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: "500" },
  drawerBottom: { borderTopWidth: 0.5, borderTopColor: colors.border, paddingVertical: 8 },
});
