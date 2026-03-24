# Alloul One — خارطة تنفيذ (Blueprint → كود)

هذه الوثيقة تترجم رؤية **CEO + Architect** إلى مراحل قابلة للشحن على الموبايل (Expo) والباكند (FastAPI)، بدون ادّعاء تطابق 100% مع أي منتج خارجي — نفس **الفكرة والطبقات** مع هوية **Alloul One**.

مرجع بصري إضافي: `docs/alloul-one-foundation.md`.

---

## 1) ما هو موجود اليوم (Baseline)

| المجال | الحالة |
|--------|--------|
| Auth: Email/Password + Register | ✅ |
| Auth: Google (Firebase → JWT) | ✅ (يحتاج ضبط env في البناء) |
| Auth: Microsoft (Azure id_token → JWT) | ✅ |
| Feed بوستات أساسي | ✅ جزئي |
| Notifications / Profile / Company API helpers | 🔶 واجهات غالبًا placeholder |
| Stripe / شركات / اشتراك | 🔶 باكند غني — واجهة موبايل غير مكتملة |
| Sendbird / Stream / Meetings | 🔶 باكند جزئي أو placeholder |
| AI Agent | 🔶 باكند موجود — تكامل UI محدود |
| Mode Switch: Media ⇄ Company | 🔶 هيكل تنقل موجود — زر/تجربة موحدة تحتاج إكمال |

---

## 2) المبادئ (قبل الصور)

1. **شحن تدريجي**: كل مرحلة = build قابل للاختبار (TestFlight / Internal).
2. **نفس الحساب، عالمان**: Shell واحد + تبديل واضح بين **Media** و **Company**.
3. **الدفع قبل إنشاء شركة**: يبقى شرط المنتج — يُنفَّذ في تدفق الشركة + Stripe كما في الباكند.
4. **التصميم**: بعد استلام الصور نستخرج **tokens** (ألوان، ظلال، زوايا، حركة) ونطبّقها على `src/theme/` و `GlassCard` بدون نسخ حرفي لأي تطبيق.

---

## 3) المراحل (مقترحة تنفيذ)

### المرحلة A — تجربة دخول وإنشاء حساب (أسبوع ~1)

- شاشة ترحيب / Onboarding خفيف (3 شرائح أو خطوة واحدة + CTA).
- تحسين تسجيل الدخول: حالات تحميل، أخطاء واضحة، روابط سياسة/خصوصية (نصوص).
- Google: التأكد من `EXPO_PUBLIC_*` + Redirect في Google Cloud + iOS URL scheme.
- (اختياري قريب) **Apple Sign In** لمتطلبات App Store عند وجود بدائل تسجيل دخول اجتماعية.
- تدفق **إنشاء مستخدم** بعد أول دخول: إكمال الملف (اسم، صورة اختيارية) عبر `PATCH /auth/me` إن لزم.

**مخرجات:** مستخدم جديد يسجّل ويدخل ويرى الـ Feed بدون احتكاك.

### المرحلة B — Media Mode كامل “قابل للعرض” (~2 أسابيع)

- Feed: تفاعلات، تعليقات (إن وُجدت في API)، حفظ/مشاركة UI.
- Discover: تبويبات (أشخاص، شركات، وظائف…) مع بحث يتصل بـ `/search` تدريجيًا.
- Profile مستخدم: غلاف، bio، أرقام، My ID (`i_code`).
- Company page عامة: قراءة من API الشركات/المتابعة حسب الجاهزية.
- Stories/Shorts: إن الباكند جاهز — وإلا واجهة + placeholder ذكي.

**مخرجات:** نسخة TestFlight “تبدو منصة اجتماعية حقيقية”.

### المرحلة C — Company Mode + اشتراك (~2–3 أسابيع)

- تدفق: اختيار “إنشاء شركة” → Stripe Checkout (من الباكند) → العودة للتطبيق → لوحة الشركة.
- Dashboard / Teams / Projects: ربط شاشات حقيقية بـ routers الموجودة.
- صلاحيات بسيطة في الواجهة (عرض فقط للأدوار حتى تكتمل الـ RBAC الكاملة).

**مخرجات:** مسار SaaS يُقاس بـ MRR تجريبي.

### المرحلة D — تواصل + AI + Analytics (~متتابع)

- Chat: Sendbird أو Stream حسب ما يثبت في الباكند؛ إزالة الـ placeholders أو إخفاؤها عن الإنتاج.
- AI: شاشة مساعد + ملخصات سياقية (مشاريع/محادثات) مع `/agent` أو المسارات الجاهزة.
- Analytics: لوحات بسيطة من `/dashboard` وتقارير لاحقة.

### المرحلة E — Data Engine (بنية تحتية)

- PostgreSQL في الإنتاج، Redis (جلسات/معدل)، Meilisearch للبحث — حسب الأولوية والتكلفة.
- Alembic (migrations) بدل الاعتماد على `create_all` فقط في المدى الطويل.

---

## 4) ما نحتاجه منك (للصور والتصميم “أجمل”)

عند إرسال الصور، رجاءً:

1. **3–5 لقطات** كحد أدنى: شاشة دخول، Feed، Discover، Profile، Company أو Dashboard.
2. لكل صورة: **هل هي Media أم Company؟** و**Dark فقط أم Light أيضًا؟**
3. أي **خط** تفضّله (أو نستخدم النظام الافتراضي + أوزان قريبة).
4. لون **Accent** الأساسي إن كان محددًا (Aurora يمكن توليده من palette).

بعدها نحدّث: `colors.ts`, `glass.ts`, `typography.ts`, ومكوّنات مشتركة (أزرار، بطاقات، headers).

---

## 5) أوامر سريعة للتذكير (TestFlight)

```bash
npx eas build -p ios --profile preview    # تجربة داخلية أولًا
npx eas build -p ios --profile production
npx eas submit -p ios --profile production
```

تأكد من تعبئة `EXPO_PUBLIC_*` في EAS Secrets أو ملف env للبناء حتى Google/Microsoft و `apiUrl` يعملان في النسخة المرفوعة.

---

## 6) الخطوة التالية المقترحة في الكود

1. Onboarding + تحسين Auth UI.
2. Mode Switcher واضح في الـ Drawer يغيّر التبويبات/العنوان فقط (بدون تكرار stacks).
3. ربط Discover و Profile بـ API فعلي حسب endpoints الجاهزة.

*آخر تحديث: وثيقة تنفيذ أولية — تُحدَّث مع كل مرحلة شحن.*
