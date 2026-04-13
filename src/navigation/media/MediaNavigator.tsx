import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MediaTabs from "../MediaTabs";
import CreatePostScreen from "../../features/media/screens/CreatePostScreen";
import CommunitiesScreen from "../../features/media/screens/CommunitiesScreen";
import JobsScreen from "../../features/media/screens/JobsScreen";
import MarketplaceScreen from "../../features/media/screens/MarketplaceScreen";
import DiscoverScreen from "../../features/discover/screens/DiscoverScreen";
import CompanyProfileScreen from "../../shared/screens/CompanyProfileScreen";
import ProfileScreen from "../../shared/screens/ProfileScreen";
import SettingsScreen from "../../features/settings/screens/SettingsScreen";
import AdminHubScreen from "../../features/settings/screens/AdminHubScreen";
import NotificationsScreen from "../../features/notifications/screens/NotificationsScreen";
import PostDetailScreen from "../../features/media/screens/PostDetailScreen";
import CommunityProfileScreen from "../../features/media/screens/CommunityProfileScreen";
import DirectMessagesScreen from "../../features/messages/screens/DirectMessagesScreen";
import ConversationScreen from "../../features/messages/screens/ConversationScreen";
import CVScreen from "../../features/media/screens/CVScreen";
import JobApplicationsScreen from "../../features/companies/screens/JobApplicationsScreen";
import CallHistoryScreen from "../../screens/calls/CallHistoryScreen";
import StoryViewerScreen from "../../features/media/screens/StoryViewerScreen";
import CreateStoryScreen from "../../features/media/screens/CreateStoryScreen";
import FollowListScreen from "../../features/media/screens/FollowListScreen";
import XSettingsScreen from "../../features/settings/screens/XSettingsScreen";
import EditProfileScreen from "../../features/settings/screens/EditProfileScreen";

const Stack = createNativeStackNavigator();

export default function MediaNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MediaTabs" component={MediaTabs} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Communities" component={CommunitiesScreen} />
      <Stack.Screen name="CommunityProfile" component={CommunityProfileScreen} />
      <Stack.Screen name="Jobs" component={JobsScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={XSettingsScreen} />
      <Stack.Screen name="SettingsLegacy" component={SettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="AdminHub" component={AdminHubScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="DirectMessages" component={DirectMessagesScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="CVScreen" component={CVScreen} />
      <Stack.Screen name="JobApplications" component={JobApplicationsScreen} />
      <Stack.Screen name="CallHistory" component={CallHistoryScreen} />
      <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ animation: "fade" }} />
      <Stack.Screen name="CreateStory" component={CreateStoryScreen} options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
    </Stack.Navigator>
  );
}
