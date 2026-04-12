import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Image, Pressable, StyleSheet, Dimensions,
  StatusBar, ActivityIndicator, Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as WebBrowser from "expo-web-browser";
import AppText from "../../../shared/ui/AppText";
import { markStoryViewed, type StoryGroup } from "../../../api/stories.api";

const { width: W, height: H } = Dimensions.get("window");
const STORY_DURATION = 5000; // 5s per story

interface RouteParams {
  groups: StoryGroup[];
  startIndex: number;
}

export default function StoryViewerScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const { groups, startIndex } = route.params as RouteParams;

  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  // Mark as viewed
  useEffect(() => {
    if (story && !story.viewed_by_me) {
      void markStoryViewed(story.id).catch(() => {});
    }
  }, [story?.id]);

  // Auto-advance timer
  useEffect(() => {
    if (paused || !story || story.media_type === "live") return;
    setProgress(0);
    const interval = 50;
    const steps = STORY_DURATION / interval;
    let step = 0;
    timerRef.current = setInterval(() => {
      step++;
      setProgress(step / steps);
      if (step >= steps) goNext();
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [groupIdx, storyIdx, paused]);

  const goNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(storyIdx + 1);
      setImgLoading(true);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(groupIdx + 1);
      setStoryIdx(0);
      setImgLoading(true);
    } else {
      nav.goBack();
    }
  }, [groupIdx, storyIdx, group, groups.length, nav]);

  const goPrev = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
      setImgLoading(true);
    } else if (groupIdx > 0) {
      setGroupIdx(groupIdx - 1);
      setStoryIdx(0);
      setImgLoading(true);
    }
  }, [groupIdx, storyIdx]);

  if (!group || !story) { nav.goBack(); return null; }

  const isLive = story.media_type === "live";

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* Background image */}
      {story.media_url && story.media_type === "image" ? (
        <Image
          source={{ uri: story.media_url }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onLoadEnd={() => setImgLoading(false)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#0a0a0f" }]} />
      )}

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Progress bars */}
      <View style={styles.progressRow}>
        {group.stories.map((_, i) => (
          <View key={i} style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress * 100}%` : "0%",
                  backgroundColor: isLive ? "#ef4444" : "#fff",
                },
              ]}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.authorRow}>
          {group.author_avatar ? (
            <Image source={{ uri: group.author_avatar }} style={styles.authorAvatar} />
          ) : (
            <View style={[styles.authorAvatar, { backgroundColor: "#1e3a5f", alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: "#60a5fa", fontWeight: "800", fontSize: 14 }}>
                {(group.author_name || "U").slice(0, 1)}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppText variant="bodySm" weight="bold" style={{ color: "#fff" }}>
                {group.author_name}
              </AppText>
              {group.is_news_channel && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#0ea5e9" />
                </View>
              )}
              {isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <AppText variant="micro" style={{ color: "rgba(255,255,255,0.5)" }}>
              {group.author_username ? `@${group.author_username}` : ""}
            </AppText>
          </View>
          <Pressable onPress={() => nav.goBack()} hitSlop={16}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Caption */}
      {story.caption ? (
        <View style={styles.captionBox}>
          <AppText variant="body" style={{ color: "#fff", textAlign: "center" }}>
            {story.caption}
          </AppText>
        </View>
      ) : null}

      {/* Live: join button */}
      {isLive && story.live_url ? (
        <View style={styles.liveActions}>
          <Pressable
            style={styles.joinLiveBtn}
            onPress={() => {
              void WebBrowser.openBrowserAsync(story.live_url!);
            }}
          >
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={styles.joinLiveText}>انضم للبث المباشر</Text>
          </Pressable>
          <View style={styles.viewerCount}>
            <Ionicons name="eye" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              {story.views_count}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Loading */}
      {imgLoading && story.media_type === "image" && (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {/* Tap zones: left = prev, right = next */}
      <View style={styles.tapZones}>
        <Pressable
          style={styles.tapLeft}
          onPress={goPrev}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
        <Pressable
          style={styles.tapRight}
          onPress={goNext}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
      </View>

      {/* Views count for own stories */}
      <View style={styles.footer}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.5)" />
          <AppText variant="micro" style={{ color: "rgba(255,255,255,0.5)" }}>
            {story.views_count}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  progressRow: {
    flexDirection: "row", gap: 3, paddingHorizontal: 8, paddingTop: 54,
  },
  progressTrack: {
    flex: 1, height: 2.5, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 2, overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  header: { paddingHorizontal: 12, paddingTop: 10 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, overflow: "hidden" },
  verifiedBadge: { marginLeft: -2 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#ef4444", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  captionBox: {
    position: "absolute", bottom: 100, left: 20, right: 20,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 16, padding: 16,
  },
  liveActions: {
    position: "absolute", bottom: 120, left: 0, right: 0, alignItems: "center", gap: 12,
  },
  joinLiveBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#ef4444", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30,
    shadowColor: "#ef4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  joinLiveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  viewerCount: { flexDirection: "row", alignItems: "center", gap: 4 },
  loadingCenter: {
    ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center",
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject, flexDirection: "row", top: 120,
  },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },
  footer: {
    position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center",
  },
});
