/**
 * ALLOUL&Q AI Settings Screen
 * ============================
 * Configure AI preferences and view usage statistics.
 *
 * Features:
 * - Default AI provider selection
 * - Workspace context toggle (RAG)
 * - Language preference
 * - Usage statistics display
 * - Model information
 * - Clear conversation history
 * - Plan upgrade prompt
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';


// Types
interface SettingsState {
  defaultProvider: 'auto' | 'claude' | 'ollama';
  workspaceContextEnabled: boolean;
  language: 'ar' | 'en' | 'auto';
  messagesUsed: number;
  messagesLimit: number;
  plan: 'starter' | 'pro' | 'enterprise';
}

interface ModelInfo {
  name: string;
  provider: string;
  status: 'available' | 'loading' | 'unavailable';
  description: string;
  features: string[];
}


const { width } = Dimensions.get('window');

const COLORS = {
  dark: '#0F172A',
  darkGray: '#1E293B',
  blue: '#1E40AF',
  lightBlue: '#3B82F6',
  white: '#FFFFFF',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  success: '#10B981',
  error: '#EF4444',
  orange: '#F97316',
};

const planLimits = {
  starter: { messages: 50, hasAI: false },
  pro: { messages: 500, hasAI: true },
  enterprise: { messages: Infinity, hasAI: true },
};


const AISettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [settings, setSettings] = useState<SettingsState>({
    defaultProvider: 'auto',
    workspaceContextEnabled: true,
    language: 'auto',
    messagesUsed: 45,
    messagesLimit: 50,
    plan: 'starter',
  });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load settings on mount
  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockModels: ModelInfo[] = [
        {
          name: 'Claude 3 Opus',
          provider: 'Anthropic',
          status: 'available',
          description: 'Most capable model for complex tasks',
          features: ['Long context', 'Code analysis', 'Data insights'],
        },
        {
          name: 'Mistral 7B',
          provider: 'Ollama (Local)',
          status: 'available',
          description: 'Fast, efficient local model',
          features: ['Quick response', 'Privacy', 'Low latency'],
        },
        {
          name: 'Llama 2 13B',
          provider: 'Ollama (Local)',
          status: 'available',
          description: 'Balanced performance and accuracy',
          features: ['Context awareness', 'Multilingual', 'Reasoning'],
        },
      ];

      setModels(mockModels);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (provider: 'auto' | 'claude' | 'ollama') => {
    setSettings(prev => ({ ...prev, defaultProvider: provider }));
  };

  const handleLanguageChange = (lang: 'ar' | 'en' | 'auto') => {
    setSettings(prev => ({ ...prev, language: lang }));
  };

  const handleContextToggle = (value: boolean) => {
    setSettings(prev => ({ ...prev, workspaceContextEnabled: value }));
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Clear Conversation History',
      'This action cannot be undone. All conversations will be deleted.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            setIsLoading(true);
            try {
              // API call to clear history
              await new Promise(resolve => setTimeout(resolve, 800));
              Alert.alert('Success', 'Conversation history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleUpgradePlan = () => {
    (navigation as any).navigate("Pricing");
  };

  // Usage progress bar
  const usagePercent = (settings.messagesUsed / settings.messagesLimit) * 100;
  const isLimitNear = usagePercent >= 80;

  // Provider option component
  const ProviderOption: React.FC<{
    value: 'auto' | 'claude' | 'ollama';
    label: string;
    emoji: string;
  }> = ({ value, label, emoji }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        settings.defaultProvider === value && styles.optionButtonActive,
      ]}
      onPress={() => handleProviderChange(value)}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.optionLabel,
          settings.defaultProvider === value && styles.optionLabelActive,
        ]}
      >
        {label}
      </Text>
      {settings.defaultProvider === value && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  // Language option component
  const LanguageOption: React.FC<{
    value: 'ar' | 'en' | 'auto';
    label: string;
  }> = ({ value, label }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        settings.language === value && styles.optionButtonActive,
      ]}
      onPress={() => handleLanguageChange(value)}
    >
      <Text
        style={[
          styles.optionLabel,
          settings.language === value && styles.optionLabelActive,
        ]}
      >
        {label}
      </Text>
      {settings.language === value && (
        <Text style={styles.checkmark}>✓</Text>
      )}
    </TouchableOpacity>
  );

  // Model card component
  const ModelCard: React.FC<{ model: ModelInfo }> = ({ model }) => {
    const statusColor =
      model.status === 'available'
        ? COLORS.success
        : model.status === 'loading'
        ? COLORS.orange
        : COLORS.gray;

    return (
      <View style={styles.modelCard}>
        <View style={styles.modelHeader}>
          <View style={styles.modelTitleArea}>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelProvider}>{model.provider}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {model.status === 'available' && '✓ Ready'}
              {model.status === 'loading' && '⟳ Loading'}
              {model.status === 'unavailable' && '✗ Offline'}
            </Text>
          </View>
        </View>

        <Text style={styles.modelDescription}>{model.description}</Text>

        <View style={styles.modelFeatures}>
          {model.features.map((feature, idx) => (
            <View key={idx} style={styles.featureTag}>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.lightBlue} size="large" />
            <Text style={styles.loadingText}>Loading settings...</Text>
          </View>
        ) : (
          <>
            {/* Plan Alert */}
            {settings.plan === 'starter' && (
              <View style={styles.planAlert}>
                <Text style={styles.planAlertIcon}>⚠️</Text>
                <View style={styles.planAlertContent}>
                  <Text style={styles.planAlertTitle}>Limited AI Access</Text>
                  <Text style={styles.planAlertText}>
                    Upgrade to Pro to unlock full AI features
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={handleUpgradePlan}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Usage Statistics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Usage</Text>

              <View style={styles.usageCard}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageLabel}>Messages Used</Text>
                  <Text style={styles.usageValue}>
                    {settings.messagesUsed}/{settings.messagesLimit}
                  </Text>
                </View>

                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${usagePercent}%`,
                        backgroundColor: isLimitNear
                          ? COLORS.error
                          : COLORS.success,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.usageText,
                    isLimitNear && styles.usageTextWarning,
                  ]}
                >
                  {isLimitNear
                    ? '⚠️ Approaching limit - consider upgrading'
                    : `${settings.messagesLimit - settings.messagesUsed} messages remaining`}
                </Text>
              </View>

              <View style={styles.planInfo}>
                <Text style={styles.planName}>Current Plan: Starter</Text>
                <Text style={styles.planDescription}>
                  Limited AI features. Upgrade to Pro for unlimited access.
                </Text>
              </View>
            </View>

            {/* Default AI Provider */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🧠 Default AI Provider</Text>

              <View style={styles.optionsGroup}>
                <ProviderOption
                  value="auto"
                  label="Auto (Best for task)"
                  emoji="🔄"
                />
                <ProviderOption value="claude" label="Claude (Complex)" emoji="✨" />
                <ProviderOption
                  value="ollama"
                  label="Ollama (Fast & Local)"
                  emoji="⚡"
                />
              </View>
            </View>

            {/* Language Preference */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌐 Language</Text>

              <View style={styles.optionsGroup}>
                <LanguageOption value="auto" label="Auto (Detect from device)" />
                <LanguageOption value="ar" label="العربية (Arabic)" />
                <LanguageOption value="en" label="English" />
              </View>
            </View>

            {/* Workspace Context */}
            <View style={styles.section}>
              <View style={styles.settingRow}>
                <View style={styles.settingLabel}>
                  <Text style={styles.settingTitle}>📁 Workspace Context</Text>
                  <Text style={styles.settingDescription}>
                    Use RAG to include workspace data in AI responses
                  </Text>
                </View>
                <Switch
                  value={settings.workspaceContextEnabled}
                  onValueChange={handleContextToggle}
                  trackColor={{ false: '#334155', true: '#1E40AF' }}
                  thumbColor={settings.workspaceContextEnabled ? COLORS.blue : '#64748B'}
                />
              </View>
            </View>

            {/* Available Models */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🤖 Available Models</Text>
              <View style={styles.modelsContainer}>
                {models.map((model, idx) => (
                  <ModelCard key={idx} model={model} />
                ))}
              </View>
            </View>

            {/* Clear History */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleClearHistory}
              >
                <Text style={styles.dangerButtonText}>🗑️ Clear Conversation History</Text>
              </TouchableOpacity>
            </View>

            {/* Info Footer */}
            <View style={styles.footerInfo}>
              <Text style={styles.footerTitle}>About AI Settings</Text>
              <Text style={styles.footerText}>
                Your preferences are saved locally on your device. AI responses are processed
                through our secure backend.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 12,
  },

  /* Plan Alert */
  planAlert: {
    backgroundColor: '#7C2D12',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.orange,
  },
  planAlertIcon: {
    fontSize: 24,
  },
  planAlertContent: {
    flex: 1,
  },
  planAlertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  planAlertText: {
    fontSize: 12,
    color: COLORS.lightGray,
  },
  upgradeButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },

  /* Sections */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },

  /* Usage Card */
  usageCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageLabel: {
    fontSize: 13,
    color: COLORS.gray,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  usageText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  usageTextWarning: {
    color: COLORS.error,
  },
  planInfo: {
    backgroundColor: 'rgba(30, 64, 175, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
  },
  planName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },

  /* Options */
  optionsGroup: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#1E40AF',
    borderColor: COLORS.lightBlue,
  },
  optionEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
  },
  optionLabelActive: {
    color: COLORS.white,
  },
  checkmark: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '600',
  },

  /* Settings Row */
  settingRow: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.gray,
  },

  /* Models */
  modelsContainer: {
    gap: 10,
  },
  modelCard: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modelTitleArea: {
    flex: 1,
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  modelProvider: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modelDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 10,
    lineHeight: 16,
  },
  modelFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureText: {
    fontSize: 11,
    color: COLORS.lightGray,
  },

  /* Danger Button */
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
  },

  /* Footer */
  footerInfo: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gray,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
});

export default AISettingsScreen;
