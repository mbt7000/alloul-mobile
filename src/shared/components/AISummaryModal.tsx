/**
 * ALLOUL&Q — AI Summary Modal (shared)
 * -------------------------------------
 * Unified modal used from Handover / Tasks / Meetings screens to show the
 * result of a Claude 4.5 summary call. Takes a promise factory + title and
 * handles the full flow: loading → content → error retry.
 *
 * The caller doesn't need to know about streaming, tokens, or endpoints —
 * just pass `fetcher: () => Promise<{ summary: string }>` and a label.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, ActivityIndicator,
  StyleSheet, Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

export type AISummaryResult = { summary: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fetcher: () => Promise<AISummaryResult>;
  accentColor?: string;
};

export default function AISummaryModal({
  visible,
  onClose,
  title,
  subtitle,
  fetcher,
  accentColor = '#00D4FF',
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const res = await fetcher();
      setSummary(res.summary);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message
          ? e.message
          : 'تعذّر الحصول على التحليل. تأكد من الاتصال أو إعداد الخادم.';
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (visible) {
      setSummary(null);
      setError(null);
      run();
    }
  }, [visible, run]);

  const handleShare = async () => {
    if (!summary) return;
    try {
      await Share.share({ message: `${title}\n\n${summary}` });
    } catch {}
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` }]}>
              <Ionicons name="flash" size={18} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {loading && (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={styles.loadingText}>Claude 4.5 يحلّل البيانات...</Text>
                <Text style={styles.loadingSub}>عادة أقل من ٥ ثواني</Text>
              </View>
            )}

            {!loading && error && (
              <View style={styles.center}>
                <View style={styles.errorBox}>
                  <Ionicons name="warning-outline" size={24} color="#FF4757" />
                </View>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={run} style={[styles.retryBtn, { borderColor: accentColor }]}>
                  <Ionicons name="refresh" size={14} color={accentColor} />
                  <Text style={[styles.retryText, { color: accentColor }]}>إعادة المحاولة</Text>
                </Pressable>
              </View>
            )}

            {!loading && !error && summary && (
              <View>
                <Text style={styles.summary}>{summary}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer actions */}
          {!loading && !error && summary && (
            <View style={styles.footer}>
              <Pressable onPress={handleShare} style={styles.footerBtn}>
                <Ionicons name="share-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.footerBtnText}>مشاركة</Text>
              </Pressable>
              <Pressable onPress={run} style={styles.footerBtn}>
                <Ionicons name="refresh" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.footerBtnText}>تجديد</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F1626',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: 32,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  errorBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,71,87,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summary: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  footerBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
  },
});
