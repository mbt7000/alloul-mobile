/**
 * ALLOUL&Q AI Chat Screen
 * ========================
 * Smart AI assistant that uses:
 * - Claude for complex conversations
 * - Ollama for quick replies
 * - RAG for workspace context
 *
 * Features:
 * - Real-time AI chat with model selection
 * - Workspace context integration
 * - Message actions (copy, regenerate, translate)
 * - Quick suggestion chips
 * - Dual-mode interface (Media World / Corporate World)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';


// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  tokens?: number;
  actions?: 'copy' | 'regenerate' | 'translate';
}

interface QuickSuggestion {
  id: string;
  text: string;
  textAr: string;
  emoji: string;
}


const { width, height } = Dimensions.get('window');

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
};

const quickSuggestions: QuickSuggestion[] = [
  {
    id: '1',
    text: 'Create Report',
    textAr: 'أنشئ تقرير',
    emoji: '📊',
  },
  {
    id: '2',
    text: 'Summarize Tasks',
    textAr: 'لخص المهام',
    emoji: '📋',
  },
  {
    id: '3',
    text: 'Analyze Data',
    textAr: 'حلل البيانات',
    emoji: '📈',
  },
  {
    id: '4',
    text: 'Suggest Priorities',
    textAr: 'اقترح أولويات',
    emoji: '⭐',
  },
];


const AIChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'auto' | 'claude' | 'ollama'>('auto');
  const [workspaceContextEnabled, setWorkspaceContextEnabled] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'media' | 'corporate'>('corporate');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Determine which model is being used
  const getModelLabel = () => {
    if (selectedModel === 'auto') return 'Auto';
    if (selectedModel === 'claude') return 'Claude';
    return 'Ollama';
  };

  const getModelColor = () => {
    if (selectedModel === 'claude') return COLORS.blue;
    if (selectedModel === 'ollama') return COLORS.success;
    return COLORS.gray;
  };

  // Send message to AI
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      // Call backend API
      const response = await fetch('https://api.alloul-q.com/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputText,
          model: selectedModel,
          workspace_context: workspaceContextEnabled,
          mode: selectedMode,
        }),
      });

      if (!response.ok) throw new Error('API call failed');

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.response || 'I\'m not sure how to respond to that.',
        timestamp: new Date(),
        model: data.model || selectedModel,
        tokens: data.tokens || 0,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }

    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, selectedModel, workspaceContextEnabled, selectedMode]);

  // Handle quick suggestion click
  const handleQuickSuggestion = (suggestion: QuickSuggestion) => {
    setInputText(suggestion.text);
    setTimeout(() => handleSendMessage(), 100);
  };

  // Copy message to clipboard
  const handleCopyMessage = (message: ChatMessage) => {
    // In real implementation, use react-native-clipboard
    console.log('Copied:', message.content);
  };

  // Regenerate assistant message
  const handleRegenerateMessage = async (messageId: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  // Message bubble component
  const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
      <View
        style={[
          styles.messageBubbleContainer,
          isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}
          >
            {message.content}
          </Text>

          {!isUser && message.model && (
            <Text style={styles.modelLabel}>
              {`${getModelLabel()} • ${new Date(message.timestamp).toLocaleTimeString()}`}
            </Text>
          )}
        </View>

        {!isUser && (
          <View style={styles.messageActions}>
            <TouchableOpacity onPress={() => handleCopyMessage(message)}>
              <Text style={styles.actionIcon}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleRegenerateMessage(message.id)}>
              <Text style={styles.actionIcon}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.actionIcon}>🌐</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Empty state component
  const EmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={styles.emptyStateIcon}>🤖</Text>
      <Text style={styles.emptyStateTitle}>ALLOUL&Q AI Assistant</Text>
      <Text style={styles.emptyStateSubtitle}>
        Smart conversations powered by Claude, Ollama & RAG
      </Text>
      <View style={styles.quickSuggestionsContainer}>
        {quickSuggestions.map(suggestion => (
          <TouchableOpacity
            key={suggestion.id}
            style={styles.quickSuggestionChip}
            onPress={() => handleQuickSuggestion(suggestion)}
          >
            <Text style={styles.chipEmoji}>{suggestion.emoji}</Text>
            <Text style={styles.chipText}>{suggestion.textAr}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <View style={styles.headerRight}>
              {/* Workspace Context Toggle */}
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  workspaceContextEnabled && styles.toggleButtonActive,
                ]}
                onPress={() => setWorkspaceContextEnabled(!workspaceContextEnabled)}
              >
                <Text style={styles.toggleLabel}>
                  {workspaceContextEnabled ? '🏢' : '📄'}
                </Text>
              </TouchableOpacity>

              {/* Model Selector */}
              <TouchableOpacity
                style={[styles.modelButton, { borderColor: getModelColor() }]}
                onPress={() => setShowModelSelector(!showModelSelector)}
              >
                <Text style={styles.modelButtonText}>{getModelLabel()}</Text>
                <Text style={styles.modelButtonIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Model Selector Dropdown */}
          {showModelSelector && (
            <View style={styles.modelSelectorDropdown}>
              {(['auto', 'claude', 'ollama'] as const).map(model => (
                <TouchableOpacity
                  key={model}
                  style={[
                    styles.modelOption,
                    selectedModel === model && styles.modelOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedModel(model);
                    setShowModelSelector(false);
                  }}
                >
                  <Text style={styles.modelOptionText}>
                    {model === 'auto' && '🔄 Auto'}
                    {model === 'claude' && '🧠 Claude'}
                    {model === 'ollama' && '⚡ Ollama'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Mode Tabs */}
          <View style={styles.modeTabs}>
            {(['media', 'corporate'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeTab,
                  selectedMode === mode && styles.modeTabActive,
                ]}
                onPress={() => setSelectedMode(mode)}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    selectedMode === mode && styles.modeTabTextActive,
                  ]}
                >
                  {mode === 'media' ? 'Media World' : 'Corporate World'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble message={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={<EmptyState />}
          scrollEnabled={true}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.lightBlue} size="small" />
            <Text style={styles.loadingText}>
              {selectedModel === 'claude' && 'Claude is thinking...'}
              {selectedModel === 'ollama' && 'Ollama is responding...'}
              {selectedModel === 'auto' && 'AI is thinking...'}
            </Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything..."
              placeholderTextColor={COLORS.gray}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Text style={styles.sendButtonIcon}>➤</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.charCounter}>{inputText.length}/1000</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.darkGray,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.blue,
  },
  toggleLabel: {
    fontSize: 16,
  },
  modelButton: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  modelButtonText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  modelButtonIcon: {
    fontSize: 14,
  },
  modelSelectorDropdown: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  modelOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modelOptionSelected: {
    backgroundColor: '#334155',
  },
  modelOptionText: {
    fontSize: 14,
    color: COLORS.white,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: COLORS.blue,
  },
  modeTabText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: COLORS.white,
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubbleContainer: {
    marginVertical: 8,
    alignItems: 'flex-end',
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
  },
  assistantBubbleContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  userBubble: {
    backgroundColor: COLORS.blue,
  },
  assistantBubble: {
    backgroundColor: COLORS.darkGray,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: COLORS.white,
    textAlign: 'right',
  },
  assistantMessageText: {
    color: COLORS.lightGray,
  },
  modelLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 6,
  },
  messageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  quickSuggestionsContainer: {
    width: '100%',
    gap: 8,
  },
  quickSuggestionChip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.darkGray,
    alignItems: 'center',
    gap: 8,
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.darkGray,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: COLORS.dark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
    maxHeight: 100,
  },
  sendButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.blue,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  sendButtonIcon: {
    fontSize: 18,
    color: COLORS.white,
  },
  charCounter: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'right',
    marginTop: 6,
  },
});

export default AIChatScreen;
