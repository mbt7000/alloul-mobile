import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAppTheme } from "../../../theme/ThemeContext";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { apiFetch } from "../../../api";

interface Application {
  id: number;
  job_id: number;
  job_title?: string;
  company_name?: string;
  applicant_id: number;
  applicant_name?: string;
  applicant_username?: string;
  cover_letter?: string;
  status: string;
  created_at?: string;
}

interface CVData {
  full_name?: string;
  title?: string;
  summary?: string;
  phone?: string;
  email?: string;
  location?: string;
  years_experience?: number;
  skills?: string[];
  education?: string[];
  certifications?: string[];
  languages?: string[];
  linkedin_url?: string;
  portfolio_url?: string;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:  { label: "بانتظار المراجعة", color: "#f59e0b" },
  reviewed: { label: "تمت المراجعة",     color: "#60a5fa" },
  accepted: { label: "مقبول",            color: "#10b981" },
  rejected: { label: "مرفوض",            color: "#ef4444" },
};

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}س`;
  return `${Math.floor(hrs / 24)}ي`;
}

export default function JobApplicationsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors: c } = useAppTheme();

  const jobId: number = route.params?.jobId;
  const jobTitle: string = route.params?.jobTitle || "الوظيفة";

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [cv, setCv] = useState<CVData | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Application[]>(`/jobs/${jobId}/applications`);
      setApps(data);
    } catch { setApps([]); }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { void load(); }, [load]);

  const openApplicant = async (app: Application) => {
    setSelectedApp(app);
    setCv(null);
    setCvLoading(true);
    try {
      const data = await apiFetch<CVData>(`/cv/user/${app.applicant_id}`);
      setCv(data);
    } catch {
      setCv(null); // No CV uploaded
    }
    setCvLoading(false);
  };

  const updateStatus = async (appId: number, status: string) => {
    setUpdatingStatus(true);
    try {
      const updated = await apiFetch<Application>(
        `/jobs/${jobId}/applications/${appId}?status=${status}`,
        { method: "PATCH" }
      );
      setApps((prev) => prev.map((a) => (a.id === appId ? { ...a, status: updated.status } : a)));
      setSelectedApp((prev) => prev ? { ...prev, status: updated.status } : null);
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر التحديث");
    }
    setUpdatingStatus(false);
  };

  const statusCounts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    accepted: apps.filter((a) => a.status === "accepted").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold" numberOfLines={1}>{jobTitle}</AppText>
          <AppText variant="micro" tone="muted">{apps.length} متقدم</AppText>
        </View>
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: c.border }}>
        {[
          { label: "الكل", count: statusCounts.all, color: c.accentCyan },
          { label: "انتظار", count: statusCounts.pending, color: "#f59e0b" },
          { label: "مقبول", count: statusCounts.accepted, color: "#10b981" },
          { label: "مرفوض", count: statusCounts.rejected, color: "#ef4444" },
        ].map((s) => (
          <View key={s.label} style={{ flex: 1, alignItems: "center", backgroundColor: s.color + "18", borderRadius: 12, paddingVertical: 8, borderWidth: 1, borderColor: s.color + "33" }}>
            <AppText style={{ color: s.color, fontSize: 18, fontWeight: "800" }}>{s.count}</AppText>
            <AppText style={{ color: s.color, fontSize: 11, fontWeight: "600" }}>{s.label}</AppText>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 10 }}>
              <Ionicons name="people-outline" size={48} color={c.textMuted} />
              <AppText variant="bodySm" tone="muted">لا يوجد متقدمون بعد</AppText>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = STATUS_CFG[item.status] ?? { label: item.status, color: c.textMuted };
            const initials = (item.applicant_name || "U").slice(0, 2).toUpperCase();
            return (
              <TouchableOpacity
                onPress={() => openApplicant(item)}
                style={{ backgroundColor: c.bgCard, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: c.accentBlue + "22", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: c.accentBlue + "44" }}>
                  <AppText style={{ color: c.accentBlue, fontSize: 16, fontWeight: "800" }}>{initials}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySm" weight="bold">{item.applicant_name || item.applicant_username || "مجهول"}</AppText>
                  <AppText variant="micro" tone="muted">@{item.applicant_username} · {timeAgo(item.created_at)}</AppText>
                </View>
                <View style={{ backgroundColor: cfg.color + "22", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: cfg.color + "44" }}>
                  <AppText style={{ color: cfg.color, fontSize: 11, fontWeight: "700" }}>{cfg.label}</AppText>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Applicant detail modal */}
      <Modal visible={selectedApp !== null} transparent animationType="slide" onRequestClose={() => setSelectedApp(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}>
          <View style={{ backgroundColor: c.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingBottom: 40 }}>
            {/* Modal header */}
            <View style={{ flexDirection: "row", alignItems: "center", padding: 18, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.accentBlue + "22", alignItems: "center", justifyContent: "center" }}>
                <AppText style={{ color: c.accentBlue, fontSize: 16, fontWeight: "800" }}>
                  {(selectedApp?.applicant_name || "U").slice(0, 2).toUpperCase()}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold">{selectedApp?.applicant_name || selectedApp?.applicant_username}</AppText>
                <AppText variant="micro" tone="muted">@{selectedApp?.applicant_username}</AppText>
              </View>
              <TouchableOpacity onPress={() => setSelectedApp(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18 }}>
              {/* Cover letter */}
              {selectedApp?.cover_letter ? (
                <View style={{ backgroundColor: c.cardStrong, borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
                  <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>الرسالة التعريفية</AppText>
                  <AppText variant="body" style={{ lineHeight: 22 }}>{selectedApp.cover_letter}</AppText>
                </View>
              ) : null}

              {/* CV Section */}
              <AppText variant="bodySm" weight="bold" style={{ marginBottom: 12 }}>
                السيرة الذاتية {cvLoading ? "" : cv ? "" : "(لم يُرفع بعد)"}
              </AppText>

              {cvLoading ? (
                <ActivityIndicator color={c.accentCyan} style={{ marginVertical: 20 }} />
              ) : cv ? (
                <>
                  {cv.title ? <AppText variant="caption" tone="muted" style={{ marginBottom: 12 }}>{cv.title} {cv.years_experience !== undefined ? `· ${cv.years_experience === 0 ? "حديث التخرج" : `${cv.years_experience}+ سنة`}` : ""}</AppText> : null}
                  {cv.summary ? <View style={{ backgroundColor: c.cardStrong, borderRadius: 12, padding: 12, marginBottom: 12 }}><AppText variant="caption" style={{ lineHeight: 20 }}>{cv.summary}</AppText></View> : null}

                  {/* Contact */}
                  {(cv.phone || cv.email || cv.location) ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                      {cv.phone ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="call-outline" size={13} color={c.textMuted} /><AppText variant="caption" tone="muted">{cv.phone}</AppText></View> : null}
                      {cv.email ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="mail-outline" size={13} color={c.textMuted} /><AppText variant="caption" tone="muted">{cv.email}</AppText></View> : null}
                      {cv.location ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="location-outline" size={13} color={c.textMuted} /><AppText variant="caption" tone="muted">{cv.location}</AppText></View> : null}
                    </View>
                  ) : null}

                  {/* Skills */}
                  {(cv.skills || []).length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>المهارات</AppText>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {cv.skills!.map((s) => (
                          <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.accentBlue + "22", borderWidth: 1, borderColor: c.accentBlue + "44" }}>
                            <AppText style={{ color: c.accentBlue, fontSize: 12 }}>{s}</AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Education */}
                  {(cv.education || []).length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>التعليم</AppText>
                      {cv.education!.map((e, i) => <AppText key={i} variant="caption" style={{ marginBottom: 3 }}>• {e}</AppText>)}
                    </View>
                  ) : null}

                  {/* Certs */}
                  {(cv.certifications || []).length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>الشهادات</AppText>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {cv.certifications!.map((cert) => (
                          <View key={cert} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.accentCyan + "18", borderWidth: 1, borderColor: c.accentCyan + "33" }}>
                            <AppText style={{ color: c.accentCyan, fontSize: 12 }}>{cert}</AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Languages */}
                  {(cv.languages || []).length > 0 ? (
                    <View style={{ marginBottom: 12 }}>
                      <AppText variant="micro" weight="bold" tone="muted" style={{ marginBottom: 6 }}>اللغات</AppText>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {cv.languages!.map((l) => (
                          <View key={l} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.cardStrong, borderWidth: 1, borderColor: c.border }}>
                            <AppText variant="caption">{l}</AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={{ alignItems: "center", padding: 20 }}>
                  <Ionicons name="document-outline" size={36} color={c.textMuted} />
                  <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>لم يُرفع سيرة ذاتية بعد</AppText>
                </View>
              )}

              {/* Status actions */}
              <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 16 }}>
                <AppText variant="caption" weight="bold" tone="muted" style={{ marginBottom: 10 }}>تغيير الحالة</AppText>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => selectedApp && updateStatus(selectedApp.id, key)}
                      disabled={updatingStatus || selectedApp?.status === key}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1,
                        borderColor: selectedApp?.status === key ? cfg.color : c.border,
                        backgroundColor: selectedApp?.status === key ? cfg.color + "22" : "transparent",
                      }}
                    >
                      <AppText style={{ color: selectedApp?.status === key ? cfg.color : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                        {cfg.label}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
