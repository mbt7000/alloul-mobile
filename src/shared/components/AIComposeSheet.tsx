/**
 * AIComposeSheet
 * ==============
 * Bottom-sheet for creating company records via natural language.
 *
 * Flow:
 *   user types text  →  parse (preview)  →  user reviews  →  confirm (save)
 *
 * Modes: "task" | "handover" | "transaction"
 * Each mode is fully isolated — no mixed logic.
 *
 * Usage:
 *   <AIComposeSheet
 *     visible={showAI}
 *     mode="task"
 *     projectId={selectedProjectId}   // optional
 *     onClose={() => setShowAI(false)}
 *     onSaved={() => reload()}
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
  parseTransactionText,
  confirmAITask,
  confirmAIHandover,
  confirmAITransaction,
  type AITaskExtracted,
  type AIHandoverExtracted,
  type AITransactionExtracted,
} from "../../api/ai.api";

// ─── Types ────────────────────────────────────────────────────────────────

type AIMode = "task" | "handover" | "transaction";

type Extraction =
  | { mode: "task"; data: AITaskExtracted }
  | { mode: "handover"; data: AIHandoverExtracted }
  | { mode: "transaction"; data: AITransactionExtracted };

interface Props {
  visible: boolean;
  mode: AIMode;
  projectId?: number;
  onClose: () => void;
  onSaved?: (result: unknown) => void;
}

// ─── Copy ─────────────────────────────────────────────────────────────────

const LABEL: Record<AIMode, string> = {
  task: "مهمة",
  handover: "تسليم",
  transaction: "معاملة مالية",
};

const PLACEHOLDER: Record<AIMode, string> = {
  task: "مثال: تصميم صفحة التسجيل وتسليمها لأحمد بحلول الخميس بأولوية عالية",
  handover: "مثال: تسليم مشروع X من محمد إلى سارة، 12,000 ريال معلق، الملف في Drive، متابعة الأحد",
  transaction: "مثال: بعت باقة دعم سنوية لشركة النور اليوم بـ 5000 ريال",
};

const ICON: Record<AIMode, React.ComponentProps<typeof Ionicons>["name"]> = {
  task: "checkbox-outline",
  handover: "swap-horizontal-outline",
  transaction: "cash-outline",
};

// ─── Preview field renderer ───────────────────────────────────────────────

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <View style={fieldStyles.row}>
      <AppText variant="micro" tone="muted" style={fieldStyles.label}>{label}</AppText>
      <AppText variant="bodySm" style={fieldStyles.value}>{String(value)}</AppText>
    </View>
  );
}

function ListField({ label, items }: { label: string; items?: string[] | null }) {
  if (!items?.length) return null;
  return (
    <View style={fieldStyles.row}>
      <AppText variant="micro" tone="muted" style={fieldStyles.label}>{label}</AppText>
      <View style={{ flex: 1, gap: 3 }}>
        {items.map((item, i) => (
          <AppText key={i} variant="bodySm">• {item}</AppText>
        ))}
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4, gap: 8 },
  label: { width: 88, textAlign: "right", paddingTop: 2 },
  value: { flex: 1 },
});

function PreviewCard({ extraction }: { extraction: Extraction }) {
  if (extraction.mode === "task") {
    const d = extraction.data;
    return (
      <>
        <Field label="العنوان" value={d.title} />
        <Field label="الوصف" value={d.description} />
        <Field label="مُسنَد إلى" value={d.assigned_to} />
        <Field label="الأولوية" value={d.priority} />
        <Field label="الحالة" value={d.status} />
        <Field label="تاريخ التسليم" value={d.due_date} />
        <Field label="العميل" value={d.related_client} />
        {d.tags?.length ? <Field label="الوسوم" value={d.tags.join("، ")} /> : null}
        <Field label="ملاحظات" value={d.notes} />
      </>
    );
  }
  if (extraction.mode === "handover") {
    const d = extraction.data;
    return (
      <>
        <Field label="العنوان" value={d.handover_title} />
        <Field label="العميل" value={d.client_name} />
        <Field label="الحالة" value={d.current_status} />
        <Field label="من" value={d.from_person} />
        <Field label="إلى" value={d.to_person} />
        <Field label="القسم" value={d.department} />
        <Field label="مستوى الخطر" value={d.risk_level} />
        <Field label="المبلغ" value={d.flagged_amount != null ? `${d.flagged_amount} ${d.currency ?? ""}`.trim() : null} />
        <Field label="الموعد النهائي" value={d.deadline} />
        <Field label="الملخص" value={d.summary} />
        <ListField label="معلق" items={d.pending_actions} />
      </>
    );
  }
  if (extraction.mode === "transaction") {
    const d = extraction.data;
    return (
      <>
        <Field label="النوع" value={d.transaction_type} />
        <Field label="المبلغ" value={d.amount != null ? `${d.amount} ${d.currency ?? "SAR"}`.trim() : null} />
        <Field label="الحالة" value={d.payment_status} />
        <Field label="الطرف" value={d.counterparty_name} />
        <Field label="المنتج / الخدمة" value={d.item_name} />
        <Field label="الكمية" value={d.quantity} />
        <Field label="التاريخ" value={d.transaction_date} />
        <Field label="الفئة" value={d.category} />
        <Field label="رقم الفاتورة" value={d.invoice_number} />
        <Field label="ملاحظات" value={d.notes} />
      </>
    );
  }
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────

export default function AIComposeSheet({ visible, mode, projectId, onClose, onSaved }: Props) {
  const { colors } = useAppTheme();
  const [text, setText] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [stage, setStage] = useState<"input" | "parsing" | "confirm" | "saving" | "done">("input");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const reset = useCallback(() => {
    setText("");
    setStage("input");
    setExtraction(null);
    setError(null);
    setWarnings([]);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // ── Parse (preview) ──────────────────────────────────────────────────────

  const handleParse = useCallback(async () => {
    if (text.trim().length < 5) return;
    setError(null);
    setWarnings([]);
    setStage("parsing");
    try {
      if (mode === "task") {
        const res = await parseTaskText(text.trim());
        setExtraction({ mode: "task", data: res.extracted as AITaskExtracted });
        setWarnings(res.warnings ?? []);
      } else if (mode === "handover") {
        const res = await parseHandoverText(text.trim());
        setExtraction({ mode: "handover", data: res.extracted as AIHandoverExtracted });
        setWarnings(res.warnings ?? []);
      } else {
        const res = await parseTransactionText(text.trim());
        setExtraction({ mode: "transaction", data: res.extracted as AITransactionExtracted });
        setWarnings(res.warnings ?? []);
      }
      setStage("confirm");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("timeout") || msg.includes("aborted")) {
        setError("انتهت المهلة — الذكاء الاصطناعي مشغول. حاول مرة أخرى.");
      } else if (msg.includes("Network") || msg.includes("fetch")) {
        setError("تعذر الاتصال بالخادم. تحقق من الإنترنت.");
      } else {
        setError("فشل في تحليل النص. تحقق من الاتصال وحاول مجدداً.");
      }
      setStage("input");
    }
  }, [text, mode]);

  // ── Confirm (save) ───────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!extraction) return;
    setStage("saving");
    setError(null);
    try {
      let result: unknown;
      if (extraction.mode === "task") {
        const d = extraction.data;
        result = await confirmAITask({
          extraction: {
            title: d.title ?? "مهمة جديدة",
            description: d.description,
            priority: d.priority,
            status: d.status,
            due_date: d.due_date,
            assigned_to: d.assigned_to,
            related_client: d.related_client,
            tags: d.tags,
            notes: d.notes,
            project_id: projectId ?? null,
          },
        });
      } else if (extraction.mode === "handover") {
        const d = extraction.data;
        result = await confirmAIHandover({
          extraction: {
            handover_title: d.handover_title ?? "تسليم جديد",
            client_name: d.client_name,
            current_status: d.current_status,
            from_person: d.from_person,
            to_person: d.to_person,
            department: d.department,
            pending_actions: d.pending_actions,
            important_contacts: d.important_contacts,
            referenced_files: d.referenced_files,
            flagged_amount: d.flagged_amount,
            currency: d.currency,
            deadline: d.deadline,
            risk_level: d.risk_level,
            summary: d.summary,
            content: d.content,
            notes: d.notes,
          },
        });
      } else {
        const d = extraction.data;
        if (!d.amount) {
          setError("لا يمكن حفظ معاملة بدون مبلغ.");
          setStage("confirm");
          return;
        }
        result = await confirmAITransaction({
          extraction: {
            amount: d.amount,
            currency: d.currency,
            transaction_type: d.transaction_type,
            payment_status: d.payment_status,
            counterparty_name: d.counterparty_name,
            item_name: d.item_name,
            quantity: d.quantity,
            transaction_date: d.transaction_date,
            invoice_number: d.invoice_number,
            category: d.category,
            notes: d.notes,
          },
        });
      }
      setStage("done");
      onSaved?.(result);
      setTimeout(handleClose, 900);
    } catch {
      setError("فشل في الحفظ. تأكد من أنك عضو في مساحة عمل وحاول مجدداً.");
      setStage("confirm");
    }
  }, [extraction, projectId, onSaved, handleClose]);

  // ── Render ───────────────────────────────────────────────────────────────

  const bg = colors.bgCard ?? "#111827";
  const borderColor = colors.border ?? "#1f2937";
  const cyan = colors.accentCyan ?? "#06b6d4";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable
            style={[styles.sheet, { backgroundColor: bg, borderColor: borderColor }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: borderColor }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.iconBg, { backgroundColor: `${cyan}22` }]}>
                <Ionicons name={ICON[mode]} size={18} color={cyan} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold">
                  إنشاء {LABEL[mode]} بالذكاء الاصطناعي
                </AppText>
                <AppText variant="micro" tone="muted">
                  اكتب بالعربي أو الإنجليزي — سيفهم الذكاء التفاصيل
                </AppText>
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
              {/* ── Stage: input ── */}
              {(stage === "input" || stage === "parsing") && (
                <>
                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={setText}
                    placeholder={PLACEHOLDER[mode]}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    autoFocus
                    style={[
                      styles.textarea,
                      {
                        color: colors.textPrimary,
                        borderColor: borderColor,
                        backgroundColor: `${borderColor}55`,
                      },
                    ]}
                    textAlign="right"
                  />
                  {error ? (
                    <AppText variant="micro" style={{ color: "#ef4444", marginTop: 4 }}>
                      {error}
                    </AppText>
                  ) : null}
                  {stage === "parsing" ? (
                    <View style={[styles.btn, { backgroundColor: `${cyan}22`, borderWidth: 1, borderColor: `${cyan}44`, gap: 10 }]}>
                      <ActivityIndicator size="small" color={cyan} />
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodySm" weight="bold" style={{ color: cyan }}>
                          جارٍ التحليل بالذكاء الاصطناعي...
                        </AppText>
                        <AppText variant="micro" tone="muted">
                          قد يستغرق حتى دقيقة — لا تغلق النافذة
                        </AppText>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={[
                        styles.btn,
                        {
                          backgroundColor: cyan,
                          opacity: text.trim().length < 5 ? 0.5 : 1,
                        },
                      ]}
                      onPress={handleParse}
                      disabled={text.trim().length < 5}
                    >
                      <Ionicons name="sparkles" size={16} color="#fff" />
                      <AppText variant="bodySm" weight="bold" style={{ color: "#fff" }}>
                        تحليل
                      </AppText>
                    </Pressable>
                  )}
                </>
              )}

              {/* ── Stage: confirm ── */}
              {(stage === "confirm" || stage === "saving") && extraction && (
                <>
                  {/* Warnings from AI engine */}
                  {warnings.length > 0 && (
                    <View
                      style={{
                        backgroundColor: "#f59e0b18",
                        borderColor: "#f59e0b44",
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 4,
                        gap: 3,
                      }}
                    >
                      {warnings.map((w, i) => (
                        <AppText key={i} variant="micro" style={{ color: "#f59e0b" }}>
                          ⚠ {w}
                        </AppText>
                      ))}
                    </View>
                  )}

                  {/* Extracted data preview */}
                  <View
                    style={[
                      styles.previewCard,
                      { borderColor: `${cyan}44`, backgroundColor: `${cyan}0a` },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 10,
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={16} color={cyan} />
                      <AppText
                        variant="bodySm"
                        weight="bold"
                        style={{ color: cyan }}
                      >
                        البيانات المستخرجة — راجع قبل الحفظ
                      </AppText>
                    </View>
                    <PreviewCard extraction={extraction} />
                  </View>

                  {error ? (
                    <AppText
                      variant="micro"
                      style={{ color: "#ef4444", marginTop: 4 }}
                    >
                      {error}
                    </AppText>
                  ) : null}

                  {/* Action buttons */}
                  <View style={styles.btnRow}>
                    <Pressable
                      style={[styles.btn, { flex: 1, backgroundColor: borderColor }]}
                      onPress={() => {
                        setStage("input");
                        setExtraction(null);
                        setWarnings([]);
                      }}
                      disabled={stage === "saving"}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={16}
                        color={colors.textPrimary}
                      />
                      <AppText variant="bodySm" weight="bold">
                        تعديل
                      </AppText>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.btn,
                        {
                          flex: 2,
                          backgroundColor: cyan,
                          opacity: stage === "saving" ? 0.6 : 1,
                        },
                      ]}
                      onPress={handleConfirm}
                      disabled={stage === "saving"}
                    >
                      {stage === "saving" ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="save-outline" size={16} color="#fff" />
                          <AppText
                            variant="bodySm"
                            weight="bold"
                            style={{ color: "#fff" }}
                          >
                            حفظ {LABEL[mode]}
                          </AppText>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              )}

              {/* ── Stage: done ── */}
              {stage === "done" && (
                <View
                  style={{
                    alignItems: "center",
                    paddingVertical: 36,
                    gap: 12,
                  }}
                >
                  <View
                    style={[
                      styles.iconBg,
                      {
                        backgroundColor: `${colors.success}22`,
                        width: 60,
                        height: 60,
                        borderRadius: 30,
                      },
                    ]}
                  >
                    <Ionicons name="checkmark-done" size={30} color={colors.success} />
                  </View>
                  <AppText
                    variant="body"
                    weight="bold"
                    style={{ color: colors.success }}
                  >
                    تم الحفظ بنجاح
                  </AppText>
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
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: "88%",
    minHeight: 380,
    paddingBottom: Platform.OS === "ios" ? 36 : 16,
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
    paddingBottom: 8,
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
    paddingTop: 8,
    gap: 12,
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
  previewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
});
