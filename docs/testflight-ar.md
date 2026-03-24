# رفع Alloul One على TestFlight (دليل عملي)

## اللغة في الإعدادات
- **أي مستخدم مسجّل الدخول** يقدر يفتح **الإعدادات (Menu)** ويختار لغة من الـ 5.
- التغيير يُحفظ على الجهاز ويُرسل مع الطلبات ترويسة `Accept-Language` للباكند لاحقًا.

---

## المتطلبات قبل البناء
1. **حساب Apple Developer** (برنامج مدفوع سنويًا).
2. **تطبيق في App Store Connect** بنفس الـ **Bundle ID**: `com.alloul.one`
   - إن لم يكن موجودًا: أنشئ App جديد في [App Store Connect](https://appstoreconnect.apple.com) واختر الـ Bundle ID (أو سجّله في Certificates / Identifiers).
3. **حساب Expo**: [expo.dev](https://expo.dev) ومشروع مربوط (`eas.projectId` موجود في `app.json`).

---

## 1) تثبيت EAS CLI (مرة واحدة على جهازك)
```bash
npm install -g eas-cli
```

## 2) تسجيل الدخول
```bash
cd /path/to/alloul-mobile
npx eas login
npx eas whoami
```

## 3) متغيرات البيئة للبناء (مهم للتصميم + الدخول)
في لوحة المشروع على Expo: **Project → Environment variables** (أو عبر CLI)، عيّن على الأقل:

| المتغير | الغرض |
|---------|--------|
| `EXPO_PUBLIC_API_URL` | رابط الـ API (مثل `https://api.alloul.app`) |
| اختياري: `EXPO_PUBLIC_FIREBASE_*` | Google / Firebase |
| اختياري: `EXPO_PUBLIC_GOOGLE_*` | OAuth |
| اختياري: `EXPO_PUBLIC_MICROSOFT_*` | Microsoft |

**ملاحظة:** كل ما يبدأ بـ `EXPO_PUBLIC_` يُدمَج في التطبيق وقت البناء. بدونها قد يعمل البريد/كلمة المرور فقط ولا يعمل Google/Microsoft.

للبناء من الطرفية مع متغيرات لمرة واحدة:
```bash
EXPO_PUBLIC_API_URL=https://api.alloul.app npx eas build -p ios --profile production
```

## 4) بيانات Apple في المشروع
ملف `eas.json` يحتوي مسبقًا:
- `appleId`
- `appleTeamId`

تأكد أنها لا تزال صحيحة. عند أول `submit` قد يُطلب منك **App-Specific Password** لحساب Apple.

## 5) بناء iOS (Production → مناسب لـ TestFlight)
```bash
npm run eas:build:ios
```
أو:
```bash
npx eas build -p ios --profile production
```

- أول مرة: EAS يسألك عن **credentials** (Distribution certificate + provisioning) — اختر **Let EAS handle** إن لم تكن خبيرًا.
- بعد انتهاء البناء: تحميل الـ `.ipa` أو المتابعة بالإرسال التلقائي.

## 6) رفع البناء إلى App Store Connect (TestFlight)
```bash
npm run eas:submit:ios
```
أو:
```bash
npx eas submit -p ios --profile production --latest
```

ثم من **App Store Connect**:
1. انتظر معالجة البناء (غالبًا 5–30 دقيقة).
2. **TestFlight** → اختر البناء → **Internal Testing** أو **External Testing** (الخارجي قد يحتاج مراجعة بسيطة للمعلومات).

## 7) دعوة المختبرين
- **Internal**: أعضاء فريق App Store Connect (حتى 100).
- **External**: إيميلات أو رابط دعوة + قد تحتاج "Export Compliance" ووصف قصير للتطبيق.

---

## بناء سريع للمعاينة (بدون TestFlight أحيانًا)
```bash
npm run eas:build:ios:preview
```
توزيع **internal** عبر رابط Expo (ليس دائمًا نفس تجربة TestFlight، لكنه مفيد للتصميم السريع).

---

## رقم الإصدار (Version / Build)
- `version` في `app.json` = نسخة المستخدم (مثل `1.0.0`).
- `ios.buildNumber` يبدأ من `1`؛ مع `eas.json` (`autoIncrement`) EAS يزيد رقم البناء تلقائيًا في builds لاحقة عند الحاجة.

---

## مشاكل شائعة
| المشكلة | الحل |
|--------|------|
| Bundle ID غير متطابق | طابق `com.alloul.one` في App Store Connect و Xcode/EAS |
| Google Sign-In لا يعمل في البناء | أضف `EXPO_PUBLIC_*` وأعد البناء |
| العربية والاتجاه | بعد تغيير اللغة لـ عربي، أعد فتح التطبيق مرة إذا بدا الـ layout غريبًا |
| البناء فشل لسبب permissions | راجع `ios.infoPlist` في `app.json` |

---

## الخلاصة
1. `eas login`  
2. ضبط `EXPO_PUBLIC_API_URL` (وباقي المفاتيح إن لزم)  
3. `npm run eas:build:ios`  
4. `npm run eas:submit:ios`  
5. فتح TestFlight وإضافة المختبرين  

هذا كل ما يلزم لرؤية **التصميم الكامل** على جهاز حقيقي عبر TestFlight.
