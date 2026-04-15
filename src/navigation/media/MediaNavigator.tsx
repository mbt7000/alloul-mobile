import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MediaTabs from "../MediaTabs";
import CreatePostScreen from "../../features/media/screens/CreatePostScreen";
import DiscoverScreen from "../../features/discover/screens/DiscoverScreen";
import CompanyProfileScreen from "../../shared/screens/CompanyProfileScreen";
import ProfileScreen from "../../shared/screens/ProfileScreen";
import AdminHubScreen from "../../features/settings/screens/AdminHubScreen";
import NotificationsScreen from "../../features/notifications/screens/NotificationsScreen";
import PostDetailScreen from "../../features/media/screens/PostDetailScreen";
import DirectMessagesScreen from "../../features/messages/screens/DirectMessagesScreen";
import ConversationScreen from "../../features/messages/screens/ConversationScreen";
import CallHistoryScreen from "../../screens/calls/CallHistoryScreen";
import StoryViewerScreen from "../../features/media/screens/StoryViewerScreen";
import CreateStoryScreen from "../../features/media/screens/CreateStoryScreen";
import FollowListScreen from "../../features/media/screens/FollowListScreen";
import XSettingsScreen from "../../features/settings/screens/XSettingsScreen";
import EditProfileScreen from "../../features/settings/screens/EditProfileScreen";
import ChangePasswordScreen from "../../features/settings/screens/ChangePasswordScreen";
import PricingScreen from "../../features/billing/screens/PricingScreen";
import BillingScreen from "../../features/billing/screens/BillingScreen";

const Stack = createNativeStackNavigator();

export default function MediaNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MediaTabs" component={MediaTabs} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="Discover" component={DiscoverScreen} />
      <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={XSettingsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Pricing" component={PricingScreen} />
      <Stack.Screen name="Billing" component={BillingScreen} />
      <Stack.Screen name="AdminHub" component={AdminHubScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="DirectMessages" component={DirectMessagesScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
      <Stack.Screen name="CallHistory" component={CallHistoryScreen} />
      <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ animation: "fade" }} />
      <Stack.Screen name="CreateStory" component={CreateStoryScreen} options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
    </Stack.Navigator>
  );
}
