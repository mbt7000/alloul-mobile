import React, { useCallback, useEffect, useState } from "react";
import {
  View, FlatList, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Alert, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { useAppTheme } from "../../../theme/ThemeContext";
import { apiFetch } from "../../../api";
import { useAuth } from "../../../state/auth/AuthContext";

interface JobPost {
  id: number;
  company_id: number;
  company_name?: string;
  company_industry?: string;
  title: string;
  industry?: string;
  job_type: string;
  location?: string;
  description?: string;
  requirements?: string;
  salary_range?: string;
  required_skills?: string[];
  min_experience?: number;
  applications_count: number;
  is_active: boolean;
  created_at?: string;
  applied_by_me: boolean;
}

interface Categories {
  industries: string[];
  job_titles: string[];
}

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "دوام كامل",
  part_time: "دوام جزئي",
  remote: "عن بُعد",
  contract: "عقد مؤقت",
};

export default function JobsScreen() {
  const navigation = useNavigation<any>();
  const { colors: c } = useAppTheme();
  const { user } = useAuth();

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [categories, setCategories] = useState<Categories>({ industries: [], job_titles: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [applying, setApplying] = useState<number | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applyJobId, setApplyJobId] = useState<number | null>(null);

  // Post job modal
  const [showPost, setShowPost] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postIndustry, setPostIndustry] = useState("");
  const [postType, setPostType] = useState("full_time");
  const [postLocation, setPostLocation] = useState("");
  const [postDesc, setPostDesc] = useState("");
  const [postSalary, setPostSalary] = useState("");
  const [posting, setPosting] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const load = useCallback(async (q?: string, industry?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q?.trim()) params.set("search", q.trim());
      if (industry) params.set("industry", industry);
      const [jobsData, cats] = await Promise.all([
        apiFetch<JobPost[]>(`/jobs/?${params.toString()}`),
        apiFetch<Categories>("/jobs/categories"),
      ]);
      setJobs(jobsData);
      setCategories(cats);
    } catch {
      setJobs([]);
    }
    // Check if manager
    try {
      const role = await apiFetch<{ role: string }>("/companies/my-role");
      setIsManager(["owner","admin","manager"].includes(role.role));
    } catch { setIsManager(false); }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleApply = async (jobId: number) => {
    setApplying(jobId);
    try {
      await apiFetch(`/jobs/${jobId}/apply`, { method: "POST", body: JSON.stringify({ cover_letter: coverLetter || undefined }) });
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, applied_by_me: true, applications_count: j.applications_count + 1 } : j));
      Alert.alert("تم التقديم", "تم إرسال طلبك بنجاح ✓");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر التقديم");
    }
    setApplying(null);
    setApplyJobId(null);
    setCoverLetter("");
  };

  const handlePostJob = async () => {
    if (!postTitle.trim()) { Alert.alert("تنبيه", "يرجى إدخال عنوان الوظيفة"); return; }
    setPosting(true);
    try {
      await apiFetch("/jobs/", { method: "POST", body: JSON.stringify({ title: postTitle, industry: postIndustry || undefined, job_type: postType, location: postLocation || undefined, description: postDesc || undefined, salary_range: postSalary || undefined }) });
      Alert.alert("تم النشر", "تم نشر الوظيفة بنجاح");
      setShowPost(false);
      setPostTitle(""); setPostIndustry(""); setPostLocation(""); setPostDesc(""); setPostSalary("");
      void load();
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر النشر");
    }
    setPosting(false);
  };

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">الوظائف</AppText>
          <AppText variant="micro" tone="muted">{jobs.length} وظيفة متاحة</AppText>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("CVScreen")} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentCyan + "22", borderWidth: 1, borderColor: c.accentCyan + "44", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="document-text-outline" size={18} color={c.accentCyan} />
        </TouchableOpacity>
        {isManager ? (
          <TouchableOpacity onPress={() => setShowPost(true)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentBlue, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <Ionicons name="search-outline" size={18} color={c.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث عن وظيفة..."
          placeholderTextColor={c.textMuted}
          style={{ flex: 1, color: c.textPrimary, fontSize: 15 }}
          returnKeyType="search"
          onSubmitEditing={() => load(search, selectedIndustry || undefined)}
        />
      </View>

      {/* Industry chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
        <TouchableOpacity
          onPress={() => { setSelectedIndustry(null); void load(search, undefined); }}
          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: !selectedIndustry ? c.accentCyan : c.border, backgroundColor: !selectedIndustry ? c.accentCyan + "22" : "transparent" }}
        >
          <AppText style={{ color: !selectedIndustry ? c.accentCyan : c.textMuted, fontSize: 13, fontWeight: "700" }}>الكل</AppText>
        </TouchableOpacity>
        {categories.industries.map((ind) => (
          <TouchableOpacity
            key={ind}
            onPress={() => { setSelectedIndustry(ind); void load(search, ind); }}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: selectedIndustry === ind ? c.accentCyan : c.border, backgroundColor: selectedIndustry === ind ? c.accentCyan + "22" : "transparent" }}
          >
            <AppText style={{ color: selectedIndustry === ind ? c.accentCyan : c.textMuted, fontSize: 13 }}>{ind}</AppText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
              <Ionicons name="briefcase-outline" size={48} color={c.textMuted} />
              <AppText variant="bodySm" tone="muted">لا توجد وظائف بعد</AppText>
              {isManager ? <TouchableOpacity onPress={() => setShowPost(true)} style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: c.accentBlue }}>
                <AppText style={{ color: "#fff", fontWeight: "700" }}>انشر أول وظيفة</AppText>
              </TouchableOpacity> : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: c.bgCard, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySm" weight="bold" numberOfLines={2}>{item.title}</AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>{item.company_name}</AppText>
                </View>
                <View style={{ backgroundColor: c.accentCyan + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: c.accentCyan + "44" }}>
                  <AppText style={{ color: c.accentCyan, fontSize: 11, fontWeight: "700" }}>{JOB_TYPE_LABELS[item.job_type] || item.job_type}</AppText>
                </View>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {item.industry ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="business-outline" size={13} color={c.textMuted} /><AppText variant="micro" tone="muted">{item.industry}</AppText></View> : null}
                {item.location ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="location-outline" size={13} color={c.textMuted} /><AppText variant="micro" tone="muted">{item.location}</AppText></View> : null}
                {item.salary_range ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="cash-outline" size={13} color={c.textMuted} /><AppText variant="micro" tone="muted">{item.salary_range}</AppText></View> : null}
                {item.min_experience ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="time-outline" size={13} color={c.textMuted} /><AppText variant="micro" tone="muted">{item.min_experience}+ سنة خبرة</AppText></View> : null}
              </View>

              {item.description ? <AppText variant="caption" tone="secondary" numberOfLines={2} style={{ marginBottom: 10, lineHeight: 20 }}>{item.description}</AppText> : null}

              {(item.required_skills || []).length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10 }}>
                  {(item.required_skills || []).map((s) => (
                    <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.cardStrong, borderWidth: 1, borderColor: c.border }}>
                      <AppText style={{ fontSize: 11, color: c.textSecondary }}>{s}</AppText>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <AppText variant="micro" tone="muted">{item.applications_count} متقدم</AppText>
                {isManager ? (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("JobApplications", { jobId: item.id, jobTitle: item.title })}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: c.cardStrong, borderWidth: 1, borderColor: c.border }}
                  >
                    <Ionicons name="people-outline" size={14} color={c.textSecondary} />
                    <AppText style={{ color: c.textSecondary, fontWeight: "700", fontSize: 13 }}>المتقدمون</AppText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() => item.applied_by_me ? null : setApplyJobId(item.id)}
                    disabled={item.applied_by_me || applying === item.id}
                    style={{ paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, backgroundColor: item.applied_by_me ? c.bgCard : c.accentBlue, borderWidth: 1, borderColor: item.applied_by_me ? c.border : c.accentBlue }}
                  >
                    <AppText style={{ color: item.applied_by_me ? c.textMuted : "#fff", fontWeight: "700", fontSize: 13 }}>
                      {item.applied_by_me ? "قدّمت ✓" : "تقدّم الآن"}
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Apply modal */}
      <Modal visible={applyJobId !== null} transparent animationType="slide" onRequestClose={() => setApplyJobId(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View style={{ backgroundColor: c.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <AppText variant="h3" weight="bold" style={{ marginBottom: 8 }}>التقديم على الوظيفة</AppText>
            <AppText variant="caption" tone="muted" style={{ marginBottom: 16 }}>سيتم إرسال سيرتك الذاتية تلقائياً</AppText>
            <TextInput
              value={coverLetter}
              onChangeText={setCoverLetter}
              placeholder="رسالة تعريفية (اختياري)..."
              placeholderTextColor={c.textMuted}
              style={{ color: c.textPrimary, fontSize: 15, padding: 14, backgroundColor: c.cardStrong, borderRadius: 14, borderWidth: 1, borderColor: c.border, minHeight: 80, textAlignVertical: "top", marginBottom: 16 }}
              multiline
              maxLength={500}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => setApplyJobId(null)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, alignItems: "center" }}>
                <AppText weight="bold">إلغاء</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => applyJobId && handleApply(applyJobId)} disabled={applying !== null} style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: c.accentBlue, alignItems: "center" }}>
                {applying ? <ActivityIndicator color="#fff" /> : <AppText style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>تقدّم الآن</AppText>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post job modal */}
      <Modal visible={showPost} transparent animationType="slide" onRequestClose={() => setShowPost(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <ScrollView style={{ backgroundColor: c.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24 }} contentContainerStyle={{ padding: 24 }}>
            <AppText variant="h3" weight="bold" style={{ marginBottom: 16 }}>نشر وظيفة جديدة</AppText>
            {[
              { label: "عنوان الوظيفة *", value: postTitle, set: setPostTitle, placeholder: "مثال: مطور تطبيقات iOS" },
              { label: "الموقع", value: postLocation, set: setPostLocation, placeholder: "مثال: الرياض، السعودية" },
              { label: "نطاق الراتب", value: postSalary, set: setPostSalary, placeholder: "مثال: ٥٠٠٠ - ١٠٠٠٠ ريال" },
            ].map((f) => (
              <View key={f.label} style={{ marginBottom: 12 }}>
                <AppText variant="caption" tone="muted" style={{ marginBottom: 4 }}>{f.label}</AppText>
                <TextInput value={f.value} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={c.textMuted} style={{ color: c.textPrimary, fontSize: 15, padding: 12, backgroundColor: c.cardStrong, borderRadius: 12, borderWidth: 1, borderColor: c.border }} />
              </View>
            ))}
            <AppText variant="caption" tone="muted" style={{ marginBottom: 4 }}>نوع الدوام</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {Object.entries(JOB_TYPE_LABELS).map(([k, v]) => (
                <TouchableOpacity key={k} onPress={() => setPostType(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: postType === k ? c.accentCyan : c.border, backgroundColor: postType === k ? c.accentCyan + "22" : "transparent" }}>
                  <AppText style={{ color: postType === k ? c.accentCyan : c.textMuted, fontSize: 13 }}>{v}</AppText>
                </TouchableOpacity>
              ))}
            </View>
            <AppText variant="caption" tone="muted" style={{ marginBottom: 4 }}>الوصف</AppText>
            <TextInput value={postDesc} onChangeText={setPostDesc} placeholder="اكتب وصف الوظيفة ومتطلباتها..." placeholderTextColor={c.textMuted} style={{ color: c.textPrimary, fontSize: 15, padding: 12, backgroundColor: c.cardStrong, borderRadius: 12, borderWidth: 1, borderColor: c.border, minHeight: 80, textAlignVertical: "top", marginBottom: 16 }} multiline />
            <View style={{ flexDirection: "row", gap: 10, paddingBottom: 40 }}>
              <TouchableOpacity onPress={() => setShowPost(false)} style={{ flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, alignItems: "center" }}>
                <AppText weight="bold">إلغاء</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePostJob} disabled={posting} style={{ flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: c.accentBlue, alignItems: "center" }}>
                {posting ? <ActivityIndicator color="#fff" /> : <AppText style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>نشر الوظيفة</AppText>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
