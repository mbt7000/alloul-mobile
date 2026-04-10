/**
 * AIComposeSheet
 * A bottom-sheet that lets the user type free Arabic/English text,
 * sends it to the AI parse endpoint, shows the structured extraction
 * for confirmation, then calls the confirm endpoint to save to DB.
 *
 * Usage:
 *   <AIComposeSheet
 *     visible={showAI}
 *     mode="task"                     // "task" | "handover" | "transaction"
 *     onClose={() => setShowAI(false)}
 *     onSaved={(result) => reload()}  // called after confirmed save
 *   />
 */

import React, { useState, useRef, useCallback } from "react";
import {
  Modal,
  View,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../ui/AppText";
import { useAppTheme } from "../../theme/ThemeContext";
import {
  parseTaskText,
  parseHandoverText,
  parseSalesText,
  confirmAITask,
  confirmAIHandover,
  confirmAITransaction,
  type AITaskExtraction,
  type AIHandoverExtraction,
  type AISalesExtraction,
} from "../../api/ai.api";

type AIMode = "task" | "handover" | "transaction";

type ExtractionResult =
  | { mode: "task"; data: AITaskExtraction }
  | { mode: "handover"; data: AIHandoverExtraction }
  | { mode: "transaction"; data: AISalesExtraction };

interface Props {
  visible: boolean;
  mode: AIMode;
  projectId?: number;
  onClose: () => void;
  onSaved?: (result: unknown) => void;
}

const MODE_LABEL: Record<AIMode, string> = {
  task: "مهمة",
  handover: "تسليم",
  transaction: "معاملة",
};

const MODE_PLACEHOLDER: Record<AIMode, string> = {
  task: "مثال: تصميم صفحة التسجيل وتسليمها لأحمد بحلول الخميس بأولوية عالية",
  handover: "مثال: تسليم مشروع X من محمد إلى سارة في قسم التقنية، المهام المعلقة...",
  transaction: "مثال: فاتورة لعميل ABC بقيمة 5000 ريال، مستحقة الأسبوع القادم",
};

const MODE_ICON: Record<AIMode, React.ComponentProps<typeof Ionicons>["name"]> = {
  task: "checkbox-outline",
  handover: "swap-horizontal-outline",
  transaction: "cash-outline",
};

function ExtractionField({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <View style={fieldStyles.row}>
      <AppText variant="micro" tone="muted" style={fieldStyles.label}>{label}</AppText>
      <AppText variant="bodySm" style={fieldStyles.value}>{String(value)}</AppText>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 5, gap: 8 },
  label: { width: 90, textAlign: "right", paddingTop: 1 },
  value: { flex: 1 },
});

function renderExtraction(extraction: ExtractionResult) {
  if (extraction.mode === "task") {
    const d = extraction.data;
    return (
      <>
        <ExtractionField label="العنوان" value={d.title} />
        <ExtractionField label="الوصف" value={d.description} />
        <ExtractionField label="الأولوية" value={d.priority} />
        <ExtractionField label="الحالة" value={d.status} />
        <ExtractionField label="تاريخ التسليم" value={d.due_date} />
        <ExtractionField label="المُسنَد إلى" value={d.assignee_name} />
        <ExtractionField label="المشروع" value={d.project_name} />
        {d.tags?.length ? <ExtractionField label="الوسوم" value={d.tags.join(", ")} /> : null}
      </>
    );
  }
  if (extraction.mode === "handover") {
    const d = extraction.data;
    return (
      <>
        <ExtractionField label="العنوان" value={d.title} />
        <ExtractionField label="من" value={d.from_person} />
        <ExtractionField label="إلى" value={d.to_person} />
        <ExtractionField label="القسم" value={d.department} />
        <ExtractionField label="مستوى الخطر" value={d.risk_level} />
        <ExtractionField label="الحالة" value={d.status} />
        {d.pending_items?.length ? <ExtractionField label="معلق" value={d.pending_items.join(" • ")} /> : null}
      </>
    );
  }
  if (extraction.mode === "transaction") {
    const d = extraction.data;
    return (
      <>
        <ExtractionField label="النوع" value={d.type} />
        <ExtractionField label="المبلغ" value={d.amount != null ? `${d.amount} ${d.currency ?? ""}`.trim() : null} />
        <ExtractionField label="الحالة" value={d.status} />
        <ExtractionField label="الطرف" value={d.counterparty} />
        <ExtractionField label="الوصف" value={d.description} />
        <ExtractionField label="التاريخ" value={d.date} />
        <ExtractionField label="رقم الفاتورة" value={d.invoice_number} />
      </>
    );
  }
  return null;
}

export default function AIComposeSheet({ visible, mode, projectId, onClose, onSaved }: Props) {
  const { colors } = useAppTheme();
  const [text, setText] = useState("");
  const [stage, setStage] = useState<"input" | "parsing" | "confirm" | "saving" | "done">("input");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const reset = useCallback(() => {
    setText("");
    setStage("input");
    setExtraction(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleParse = useCallback(async () => {
    if (!text.trim()) return;
    setError(null);
    setStage("parsing");
    try {
      if (mode === "task") {
        const res = await parseTaskText(text.trim());
        setExtraction({ mode: "task", data: res.extracted });
      } else if (mode === "handover") {
        const res = await parseHandoverText(text.trim());
        setExtraction({ mode: "handover", data: res.extracted });
      } else {
        const res = await parseSalesText(text.trim());
        setExtraction({ mode: "transaction", data: res.extracted });
      }
      setStage("confirm");
    } catch {
      setError("فشل في تحليل النص. تحقق من الاتصال وحاول مجدداً.");
      setStage("input");
    }
  }, [text, mode]);

  const handleConfirm = useCallback(async () => {
    if (!extraction) return;
    setStage("saving");
    setError(null);
    try {
      let result: unknown;
      if (extraction.mode === "task") {
        result = await confirmAITask({ extraction: extraction.data, project_id: projectId ?? null });
      } else if (extraction.mode === "handover") {
        result = await confirmAIHandover({ extraction: extraction.data });
      } else {
        result = await confirmAITransaction({ extraction: extraction.data });
      }
      setStage("done");
      onSaved?.(result);
      setTimeout(handleClose, 800);
    } catch {
      setError("فشل في الحفظ. حاول مجدداً.");
      setStage("confirm");
    }
  }, [extraction, projectId, onSaved, handleClose]);

  const bg = colors.bgCard ?? "#111827";
  const border = colors.border ?? "#1f2937";
  const cyan = colors.accentCyan ?? "#06b6d4";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable style={[styles.sheet, { backgroundColor: bg, borderColor: border }]} onPress={(e) => e.stopPropagation()}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: border }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBg, { backgroundColor: `${cyan}22` }]}>
                <Ionicons name={MODE_ICON[mode]} size={18} color={cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold">إنشاء {MODE_LABEL[mode]} بالذكاء الاصطناعي</AppText>
                <AppText variant="micro" tone="muted">اكتب بالعربي أو الإنجليزي — سيفهم الذكاء التفاصيل</AppText>
              </View>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Stage: input */}
              {(stage === "input" || stage === "parsing") && (
                <>
                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={setText}
                    placeholder={MODE_PLACEHOLDER[mode]}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    autoFocus
                    style={[styles.textarea, { color: colors.textPrimary, borderColor: border, backgroundColor: `${border}55` }]}
                    textAlign="right"
                  />
                  {error ? <AppText variant="micro" style={{ color: "#ef4444", marginTop: 6 }}>{error}</AppText> : null}
                  <Pressable
                    style={[styles.btn, { backgroundColor: cyan, opacity: text.trim().length < 5 || stage === "parsing" ? 0.5 : 1 }]}
                    onPress={handleParse}
                    disabled={text.trim().length < 5 || stage === "parsing"}
                  >
                    {stage === "parsing" ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color="#fff" />
                        <AppText variant="bodySm" weight="bold" style={{ color: "#fff" }}>تحليل</AppText>
                      </>
                    )}
                  </Pressable>
                </>
              )}

              {/* Stage: confirm */}
              {(stage === "confirm" || stage === "saving") && extraction && (
                <>
                  <View style={[styles.extractionCard, { borderColor: `${cyan}44`, backgroundColor: `${cyan}0a` }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Ionicons name="checkmark-circle" size={16} color={cyan} />
                      <AppText variant="bodySm" weight="bold" style={{ color: cyan }}>البيانات المستخرجة</AppText>
                    </View>
                    {renderExtraction(extraction)}
                  </View>
                  {error ? <AppText variant="micro" style={{ color: "#ef4444", marginTop: 6 }}>{error}</AppText> : null}
                  <View style={styles.btnRow}>
                    <Pressable
                      style={[styles.btn, { flex: 1, backgroundColor: border }]}
                      onPress={() => { setStage("input"); setExtraction(null); }}
                      disabled={stage === "saving"}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.textPrimary} />
                      <AppText variant="bodySm" weight="bold">تعديل</AppText>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, { flex: 2, backgroundColor: cyan, opacity: stage === "saving" ? 0.6 : 1 }]}
                      onPress={handleConfirm}
                      disabled={stage === "saving"}
                    >
                      {stage === "saving" ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="save-outline" size={16} color="#fff" />
                          <AppText variant="bodySm" weight="bold" style={{ color: "#fff" }}>حفظ {MODE_LABEL[mode]}</AppText>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              )}

              {/* Stage: done */}
              {stage === "done" && (
                <View style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}>
                  <View style={[styles.iconBg, { backgroundColor: `${colors.success}22`, width: 56, height: 56, borderRadius: 28 }]}>
                    <Ionicons name="checkmark-done" size={28} color={colors.success} />
                  </View>
                  <AppText variant="body" weight="bold" style={{ color: colors.success }}>تم الحفظ بنجاح</AppText>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "85%",
    minHeight: 360,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 16,
    gap: 12,
    paddingTop: 4,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    lineHeight: 24,
    textAlignVertical: "top",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
  },
  extractionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
});
