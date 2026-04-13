import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CompanyListScreen from "../../features/companies/screens/CompanyListScreen";
import CompanyWorkspaceShellScreen from "../../features/companies/screens/CompanyWorkspaceShellScreen";
import CompanyDashboardScreen from "../../features/companies/screens/CompanyDashboardScreen";
import CompanyServicesScreen from "../../features/companies/screens/CompanyServicesScreen";
import ServicesHubScreen from "../../features/companies/screens/ServicesHubScreen";
import ApprovalsScreen from "../../features/companies/screens/ApprovalsScreen";
import CompanyMoreScreen from "../../features/companies/screens/CompanyMoreScreen";
import TeamScreen from "../../features/companies/screens/TeamScreen";
import ProjectsScreen from "../../features/companies/screens/ProjectsScreen";
import TasksScreen from "../../features/companies/screens/TasksScreen";
import MeetingsScreen from "../../features/meetings/screens/MeetingsScreen";
import HandoverScreen from "../../features/handover/screens/HandoverScreen";
import ChatScreen from "../../features/chat/screens/ChatScreen";
import ChannelDetailScreen from "../../features/chat/screens/ChannelDetailScreen";
import KnowledgeScreen from "../../shared/screens/KnowledgeScreen";
import CRMScreen from "../../features/companies/screens/CRMScreen";
import ReportsScreen from "../../shared/screens/ReportsScreen";
import SettingsScreen from "../../features/settings/screens/SettingsScreen";
import AdminHubScreen from "../../features/settings/screens/AdminHubScreen";
import ApprovalDetailScreen from "../../features/companies/screens/ApprovalDetailScreen";
import CompanyProfileScreen from "../../shared/screens/CompanyProfileScreen";
import CompanyFeedScreen from "../../features/companies/screens/CompanyFeedScreen";
import CompanyFilesScreen from "../../features/companies/screens/CompanyFilesScreen";
import HiringBoardScreen from "../../features/companies/screens/HiringBoardScreen";
import NotificationsScreen from "../../features/notifications/screens/NotificationsScreen";
import RolesScreen from "../../features/companies/screens/RolesScreen";
import InternalSearchScreen from "../../features/companies/screens/InternalSearchScreen";
import CompanyOnboardingScreen from "../../features/companies/screens/CompanyOnboardingScreen";
import { useCompany } from "../../state/company/CompanyContext";
import { getOnboardingStatus, getSubscriptionStatus } from "../../api";
import AiAssistantScreen from "../../features/companies/screens/AiAssistantScreen";
import SubscriptionPlansScreen from "../../features/companies/screens/SubscriptionPlansScreen";
import JobApplicationsScreen from "../../features/companies/screens/JobApplicationsScreen";
import CallHistoryScreen from "../../screens/calls/CallHistoryScreen";

const Stack = createNativeStackNavigator();

function CompanySelectorEntry({ navigation }: { navigation: any }) {
  const { company, loading } = useCompany();

  React.useEffect(() => {
    if (loading) return;
    if (!company) {
      navigation.replace("Companies");
      return;
    }

    // Check subscription before entering workspace
    void (async () => {
      try {
        const sub = await getSubscriptionStatus();
        const hasAccess = sub.status === "active" || sub.status === "trialing";

        if (!hasAccess) {
          // No active subscription — show upgrade screen
          navigation.replace("SubscriptionGate");
          return;
        }

        // Has subscription — check onboarding
        const ob = await getOnboardingStatus().catch(() => null);
        if (ob && !ob.completed) {
          navigation.replace("CompanyOnboarding");
        } else {
          navigation.replace("CompanyWorkspace");
        }
      } catch {
        // On any error, allow access (don't block on network failure)
        navigation.replace("CompanyWorkspace");
      }
    })();
  }, [company, loading, navigation]);

  return null;
}

export default function CompanyNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompanySelector" component={CompanySelectorEntry} />
      <Stack.Screen name="Companies" component={CompanyListScreen} />
      <Stack.Screen name="CompanyWorkspace" component={CompanyDashboardScreen} />
      <Stack.Screen name="CompanyWorkspaceLegacy" component={CompanyWorkspaceShellScreen} />
      <Stack.Screen name="Apps" component={CompanyServicesScreen} />
      <Stack.Screen name="AppsLegacy" component={ServicesHubScreen} />
      <Stack.Screen name="Inbox" component={ApprovalsScreen} />
      <Stack.Screen name="Profile" component={CompanyMoreScreen} />
      <Stack.Screen name="Teams" component={TeamScreen} />
      <Stack.Screen name="Team" component={TeamScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Meetings" component={MeetingsScreen} />
      <Stack.Screen name="Handover" component={HandoverScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChannelDetail" component={ChannelDetailScreen} />
      <Stack.Screen name="Knowledge" component={KnowledgeScreen} />
      <Stack.Screen name="CRM" component={CRMScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AdminHub" component={AdminHubScreen} />
      <Stack.Screen name="ApprovalDetail" component={ApprovalDetailScreen} />
      <Stack.Screen name="Company" component={CompanyProfileScreen} />
      <Stack.Screen name="CompanyFeed" component={CompanyFeedScreen} />
      <Stack.Screen name="CompanyFiles" component={CompanyFilesScreen} />
      <Stack.Screen name="Members" component={TeamScreen} />
      <Stack.Screen name="Roles" component={RolesScreen} />
      <Stack.Screen name="InternalSearch" component={InternalSearchScreen} />
      <Stack.Screen name="HiringBoard" component={HiringBoardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CompanyOnboarding" component={CompanyOnboardingScreen} />
      <Stack.Screen name="AiAssistant" component={AiAssistantScreen} />
      <Stack.Screen name="SubscriptionGate" component={SubscriptionPlansScreen} />
      <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} />
      <Stack.Screen name="JobApplications" component={JobApplicationsScreen} />
      <Stack.Screen name="CallHistory" component={CallHistoryScreen} />
    </Stack.Navigator>
  );
}
