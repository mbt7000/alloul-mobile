import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useAuth } from "../../../state/auth/AuthContext";
import { useAppTheme } from "../../../theme/ThemeContext";
import Screen from "../../../shared/layout/Screen";
import AppText from "../../../shared/ui/AppText";
import { apiFetch } from "../../../api";

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

const JOB_TITLES = [
  "مطور تطبيقات", "مطور ويب", "مهندس برمجيات", "مبرمج",
  "موظف مبيعات", "مدير مبيعات", "متخصص تسويق", "مسوّق رقمي",
  "محاسب", "مدير مالي", "موظف موارد بشرية", "موظف إداري",
  "موظف خدمة عملاء", "مدير مشاريع", "مصمم UI/UX", "محلل بيانات",
  "طبيب", "ممرض/ة", "معلم/ة", "مهندس مدني", "أخرى",
];

export default function CVScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors: c } = useAppTheme();

  const [cv, setCv] = useState<CVData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newEdu, setNewEdu] = useState("");
  const [newCert, setNewCert] = useState("");
  const [newLang, setNewLang] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<CVData>("/cv/me");
      setCv(data);
    } catch {
      // No CV yet, start fresh
      setCv({ full_name: user?.name || "", email: user?.email || "" });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/cv/me", { method: "PUT", body: JSON.stringify(cv) });
      Alert.alert("تم الحفظ", "تم حفظ السيرة الذاتية بنجاح ✓");
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر الحفظ");
    }
    setSaving(false);
  };

  const downloadPDF = async () => {
    const tags = (arr: string[]) =>
      arr.map((s) => `<span style="display:inline-block;background:#e8f0fe;color:#1a73e8;padding:3px 10px;border-radius:20px;font-size:12px;margin:3px">${s}</span>`).join("");

    const html = `
<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;color:#1a1a2e;margin:0;padding:32px;background:#fff;direction:rtl}
  h1{color:#1a73e8;font-size:26px;margin:0}
  h2{color:#1a73e8;font-size:14px;margin:0 0 2px}
  .title{color:#555;font-size:15px;margin:4px 0 0}
  .section{margin-top:22px;border-top:2px solid #e8f0fe;padding-top:12px}
  .section-title{font-size:13px;font-weight:bold;color:#1a73e8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
  .meta{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px;font-size:13px;color:#555}
  .meta span{display:flex;align-items:center;gap:4px}
  p{font-size:14px;line-height:1.7;color:#333;margin:0}
  .badge{display:inline-block;background:#f3f4f6;color:#374151;padding:4px 12px;border-radius:20px;font-size:12px;margin:3px}
  .header-line{display:flex;justify-content:space-between;align-items:flex-start}
</style>
</head>
<body>
<div class="header-line">
  <div>
    <h1>${cv.full_name || user?.name || "—"}</h1>
    <p class="title">${cv.title || ""}</p>
  </div>
  <div style="text-align:left;font-size:12px;color:#555">
    ${cv.phone ? `📞 ${cv.phone}<br/>` : ""}
    ${cv.email ? `✉️ ${cv.email}<br/>` : ""}
    ${cv.location ? `📍 ${cv.location}` : ""}
  </div>
</div>

${cv.summary ? `<div class="section"><div class="section-title">نبذة</div><p>${cv.summary}</p></div>` : ""}

${cv.years_experience !== undefined ? `<div class="section"><div class="section-title">الخبرة</div><p>${cv.years_experience === 0 ? "حديث التخرج" : `${cv.years_experience}+ سنة خبرة`}</p></div>` : ""}

${(cv.skills || []).length > 0 ? `<div class="section"><div class="section-title">المهارات</div>${tags(cv.skills!)}</div>` : ""}

${(cv.education || []).length > 0 ? `<div class="section"><div class="section-title">التعليم</div>${(cv.education || []).map((e) => `<p style="margin:4px 0">• ${e}</p>`).join("")}</div>` : ""}

${(cv.certifications || []).length > 0 ? `<div class="section"><div class="section-title">الشهادات والدورات</div>${(cv.certifications || []).map((c) => `<span class="badge">${c}</span>`).join("")}</div>` : ""}

${(cv.languages || []).length > 0 ? `<div class="section"><div class="section-title">اللغات</div>${tags(cv.languages!)}</div>` : ""}

${cv.linkedin_url || cv.portfolio_url ? `<div class="section"><div class="section-title">الروابط</div>
${cv.linkedin_url ? `<p>LinkedIn: ${cv.linkedin_url}</p>` : ""}
${cv.portfolio_url ? `<p>Portfolio: ${cv.portfolio_url}</p>` : ""}
</div>` : ""}

<div style="margin-top:30px;text-align:center;font-size:11px;color:#aaa">تم إنشاؤه بواسطة Alloul One</div>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "مشاركة السيرة الذاتية",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("تم التوليد", `السيرة الذاتية في: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert("خطأ", e?.message || "تعذّر توليد PDF");
    }
  };

  const addItem = (field: keyof CVData, val: string, setter: (v: string) => void) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    setCv((prev) => ({ ...prev, [field]: [...(prev[field] as string[] || []), trimmed] }));
    setter("");
  };

  const removeItem = (field: keyof CVData, idx: number) => {
    setCv((prev) => ({ ...prev, [field]: (prev[field] as string[]).filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: c.mediaCanvas }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={c.accentCyan} />
        </View>
      </Screen>
    );
  }

  const inputStyle = {
    color: c.textPrimary, fontSize: 15, paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: c.bgCard, borderRadius: 14, borderWidth: 1, borderColor: c.border,
    marginTop: 6,
  };

  const sectionTitle = (icon: string, title: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24, marginBottom: 8 }}>
      <Ionicons name={icon as any} size={16} color={c.accentCyan} />
      <AppText variant="bodySm" weight="bold">{title}</AppText>
    </View>
  );

  const tagRow = (items: string[], field: keyof CVData, val: string, setter: (v: string) => void, placeholder: string) => (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {(items || []).map((item, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => removeItem(field, idx)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.accentBlue + "22", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: c.accentBlue + "44" }}
          >
            <AppText style={{ color: c.accentBlue, fontSize: 13 }}>{item}</AppText>
            <Ionicons name="close" size={12} color={c.accentBlue} />
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={val}
          onChangeText={setter}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          style={{ ...inputStyle, flex: 1, marginTop: 0 }}
          onSubmitEditing={() => addItem(field, val, setter)}
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={() => addItem(field, val, setter)}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.accentBlue, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <Screen style={{ backgroundColor: c.mediaCanvas }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText variant="bodySm" weight="bold">سيرتي الذاتية</AppText>
          <AppText variant="micro" tone="muted">تُستخدم عند التقديم على وظائف</AppText>
        </View>
        <TouchableOpacity
          onPress={downloadPDF}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentCyan + "22", borderWidth: 1, borderColor: c.accentCyan + "44", alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="download-outline" size={18} color={c.accentCyan} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: c.accentBlue }}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <AppText style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>حفظ</AppText>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {sectionTitle("person-circle-outline", "المعلومات الأساسية")}

          <AppText variant="micro" tone="muted">الاسم الكامل</AppText>
          <TextInput
            value={cv.full_name || ""}
            onChangeText={(v) => setCv((p) => ({ ...p, full_name: v }))}
            placeholder="الاسم الكامل"
            placeholderTextColor={c.textMuted}
            style={inputStyle}
          />

          <AppText variant="micro" tone="muted" style={{ marginTop: 12 }}>المسمى الوظيفي</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 }}>
            {JOB_TITLES.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setCv((p) => ({ ...p, title: t }))}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: cv.title === t ? c.accentCyan : c.border, backgroundColor: cv.title === t ? c.accentCyan + "22" : "transparent" }}
              >
                <AppText style={{ color: cv.title === t ? c.accentCyan : c.textMuted, fontSize: 13 }}>{t}</AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={cv.title || ""}
            onChangeText={(v) => setCv((p) => ({ ...p, title: v }))}
            placeholder="أو اكتب مسماك الوظيفي..."
            placeholderTextColor={c.textMuted}
            style={inputStyle}
          />

          <AppText variant="micro" tone="muted" style={{ marginTop: 12 }}>نبذة مختصرة</AppText>
          <TextInput
            value={cv.summary || ""}
            onChangeText={(v) => setCv((p) => ({ ...p, summary: v }))}
            placeholder="اكتب نبذة مختصرة عن نفسك وخبراتك..."
            placeholderTextColor={c.textMuted}
            style={{ ...inputStyle, minHeight: 90, textAlignVertical: "top" }}
            multiline
            maxLength={500}
          />

          {sectionTitle("call-outline", "بيانات التواصل")}
          <AppText variant="micro" tone="muted">الجوال</AppText>
          <TextInput value={cv.phone || ""} onChangeText={(v) => setCv((p) => ({ ...p, phone: v }))} placeholder="رقم الجوال" placeholderTextColor={c.textMuted} style={inputStyle} keyboardType="phone-pad" />
          <AppText variant="micro" tone="muted" style={{ marginTop: 12 }}>البريد الإلكتروني</AppText>
          <TextInput value={cv.email || ""} onChangeText={(v) => setCv((p) => ({ ...p, email: v }))} placeholder="البريد الإلكتروني" placeholderTextColor={c.textMuted} style={inputStyle} keyboardType="email-address" />
          <AppText variant="micro" tone="muted" style={{ marginTop: 12 }}>المدينة / الموقع</AppText>
          <TextInput value={cv.location || ""} onChangeText={(v) => setCv((p) => ({ ...p, location: v }))} placeholder="الرياض، السعودية" placeholderTextColor={c.textMuted} style={inputStyle} />

          {sectionTitle("time-outline", "سنوات الخبرة")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[0, 1, 2, 3, 5, 7, 10, 15].map((y) => (
              <TouchableOpacity
                key={y}
                onPress={() => setCv((p) => ({ ...p, years_experience: y }))}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: cv.years_experience === y ? c.accentCyan : c.border, backgroundColor: cv.years_experience === y ? c.accentCyan + "22" : "transparent" }}
              >
                <AppText style={{ color: cv.years_experience === y ? c.accentCyan : c.textMuted, fontWeight: "700" }}>{y === 0 ? "حديث التخرج" : `${y}+ سنة`}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          {sectionTitle("code-slash-outline", "المهارات")}
          {tagRow(cv.skills || [], "skills", newSkill, setNewSkill, "أضف مهارة (مثال: JavaScript)")}

          {sectionTitle("school-outline", "التعليم")}
          {tagRow(cv.education || [], "education", newEdu, setNewEdu, "مثال: بكالوريوس علوم حاسب - جامعة الملك سعود")}

          {sectionTitle("ribbon-outline", "الشهادات والدورات")}
          {tagRow(cv.certifications || [], "certifications", newCert, setNewCert, "مثال: AWS Certified Developer")}

          {sectionTitle("language-outline", "اللغات")}
          {tagRow(cv.languages || [], "languages", newLang, setNewLang, "مثال: العربية، الإنجليزية")}

          {sectionTitle("link-outline", "الروابط")}
          <AppText variant="micro" tone="muted">LinkedIn</AppText>
          <TextInput value={cv.linkedin_url || ""} onChangeText={(v) => setCv((p) => ({ ...p, linkedin_url: v }))} placeholder="https://linkedin.com/in/..." placeholderTextColor={c.textMuted} style={inputStyle} keyboardType="url" />
          <AppText variant="micro" tone="muted" style={{ marginTop: 12 }}>Portfolio / GitHub</AppText>
          <TextInput value={cv.portfolio_url || ""} onChangeText={(v) => setCv((p) => ({ ...p, portfolio_url: v }))} placeholder="https://github.com/..." placeholderTextColor={c.textMuted} style={inputStyle} keyboardType="url" />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
