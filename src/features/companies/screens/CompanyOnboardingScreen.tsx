import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import AppButton from "../../../shared/ui/AppButton";
import GlassCard from "../../../shared/components/GlassCard";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useCompany } from "../../../state/company/CompanyContext";
import {
  completeOnboardingStep,
  getOnboardingStatus,
  type OnboardingStatus,
} from "../../../api";

type Step = {
  key: "profile" | "team" | "invite" | "project";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  doneKey: keyof OnboardingStatus;
};

const STEPS: Step[] = [
  {
    key: "profile",
    title: "Set up your company profile",
    description: "Add your company name and logo so your team knows who they're working for.",
    icon: "business-outline",
    doneKey: "step_profile",
  },
  {
    key: "team",
    title: "Create your first team",
    description: "Organize your company by creating a department or team.",
    icon: "people-outline",
    doneKey: "step_team",
  },
  {
    key: "invite",
    title: "Invite your first member",
    description: "Grow your workspace by inviting a colleague to join.",
    icon: "person-add-outline",
    doneKey: "step_invite",
  },
  {
    key: "project",
    title: "Create your first project",
    description: "Start tracking work by creating your team's first project.",
    icon: "folder-open-outline",
    doneKey: "step_project",
  },
];

export default function CompanyOnboardingScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { company, refresh } = useCompany();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getOnboardingStatus();
      setStatus(s);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = async (step: Step) => {
    setCompleting(step.key);
    try {
      await completeOnboardingStep(step.key);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to mark step complete");
    } finally {
      setCompleting(null);
    }
  };

  const handleFinish = async () => {
    await refresh();
    navigation.replace("CompanyWorkspace");
  };

  const allDone = status?.completed ?? false;
  const completedCount = status
    ? [status.step_profile, status.step_team, status.step_invite, status.step_project].filter(Boolean).length
    : 0;

  return (
    <Screen style={{ backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <AppText variant="h2" weight="bold" tone="primary" style={{ marginBottom: 6 }}>
            {`Welcome to ${company?.name ?? "your workspace"}`}
          </AppText>
          <AppText variant="body" tone="muted">
            Complete these steps to get your team up and running.
          </AppText>
        </View>

        {/* Progress */}
        <GlassCard style={styles.progressCard}>
          <AppText variant="micro" tone="muted" weight="bold">
            PROGRESS
          </AppText>
          <AppText variant="h3" weight="bold" tone="primary">
            {`${completedCount} / ${STEPS.length} steps done`}
          </AppText>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: allDone ? colors.success : colors.accentCyan,
                  width: `${(completedCount / STEPS.length) * 100}%`,
                },
              ]}
            />
          </View>
        </GlassCard>

        {/* Steps */}
        {loading ? (
          <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 32 }} />
        ) : (
          STEPS.map((step) => {
            const done = status ? !!status[step.doneKey] : false;
            return (
              <GlassCard key={step.key} style={[styles.stepCard, done && styles.stepDone]}>
                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepIcon,
                      { backgroundColor: done ? colors.accentCyan + "22" : colors.bgCard },
                    ]}
                  >
                    <Ionicons
                      name={done ? "checkmark-circle" : step.icon}
                      size={24}
                      color={done ? colors.accentCyan : colors.textMuted}
                    />
                  </View>
                  <View style={styles.stepText}>
                    <AppText
                      variant="body"
                      weight="bold"
                      tone={done ? "muted" : "primary"}
                      style={done ? { textDecorationLine: "line-through" } : {}}
                    >
                      {step.title}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {step.description}
                    </AppText>
                  </View>
                </View>
                {!done && (
                  <AppButton
                    label={completing === step.key ? "Marking..." : "Mark as done"}
                    onPress={() => handleComplete(step)}
                    disabled={completing === step.key}
                    tone="glass"
                    style={{ marginTop: 12 }}
                  />
                )}
              </GlassCard>
            );
          })
        )}

        {/* Finish button */}
        <AppButton
          label={allDone ? "Go to Workspace →" : "Skip for now"}
          onPress={handleFinish}
          tone={allDone ? "primary" : "glass"}
          style={{ marginTop: 8, marginBottom: 32 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
  },
  header: {
    marginBottom: 8,
  },
  progressCard: {
    padding: 16,
    gap: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  stepCard: {
    padding: 16,
  },
  stepDone: {
    opacity: 0.7,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: {
    flex: 1,
    gap: 4,
  },
});
