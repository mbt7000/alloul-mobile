# 🚀 دليل النشر - ALLOUL&Q Platform

## المراحل:
1. ✅ iOS Build & TestFlight Submission
2. ✅ Web Deployment على Vercel
3. ✅ Backend على Vercel أو Server

---

## المرحلة 1️⃣: iOS Build & TestFlight

### الخطوة 1: تثبيت المتطلبات
```bash
# تثبيت EAS CLI
npm install -g eas-cli

# تسجيل الدخول إلى Expo
eas login
# ستحتاج إلى:
# - حساب Expo (mbtalm1)
# - حساب Apple Developer
# - حساب App Store Connect
```

### الخطوة 2: بناء iOS
```bash
cd /Users/t/Desktop/alloul&QaiX

# بناء iOS لـ TestFlight
eas build --platform ios --auto-submit

# أو بدون submit تلقائي:
eas build --platform ios
```

### الخطوة 3: معلومات البناء
```
Project: ALLOUL&Q
Bundle ID: com.alloul.one
App Version: 1.0.0
Build Number: 29

Distribution Certificate:
- Serial: 3E79AFC062BA74201E33B13896906CA
- Expiration: 2027-03-22

Provisioning Profile:
- ID: VV264J5Y3V
- Status: Active
- Expiration: 2027-03-22
```

### الخطوة 4: طلبات TestFlight
تأكد من أن:
- ✅ Provisioning Profile يدعم Sign in with Apple
- ✅ com.apple.developer.applesignin entitlement موجود
- ✅ Push notifications enabled (aps-environment: production)
- ✅ Capabilities مفعلة في Xcode

**الملف:** `ios/ALLOULQ/ALLOULQ.entitlements`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>aps-environment</key>
    <string>production</string>
  </dict>
</plist>
```

### الخطوة 5: رفع على TestFlight
```bash
# بعد نجاح البناء، سيتم الرفع تلقائياً إذا استخدمت --auto-submit

# أو يدوياً:
eas submit --platform ios

# تتبع الرفع:
eas submit --status
```

### الخطوة 6: الوصول للـ TestFlight
- URL: https://testflight.apple.com
- البحث عن "ALLOUL&Q"
- دعوة الفريق للاختبار

---

## المرحلة 2️⃣: Web Deployment على Vercel

### الخطوة 1: إعداد Vercel
```bash
# تثبيت Vercel CLI
npm install -g vercel

# تسجيل الدخول
vercel login
```

### الخطوة 2: إضافة Environment Variables على Vercel Dashboard
```
EXPO_PUBLIC_API_URL=https://api.alloul.one
EXPO_PUBLIC_FIREBASE_API_KEY=***
EXPO_PUBLIC_FIREBASE_APP_ID=***
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=***
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=***
EXPO_PUBLIC_FIREBASE_PROJECT_ID=***
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=***
EXPO_PUBLIC_WEB_APP_URL=https://app.alloul.one
```

### الخطوة 3: بناء و نشر الويب
```bash
cd /Users/t/Desktop/alloul&QaiX

# نشر على Vercel
./deploy-web.sh

# أو يدوياً:
cd web
vercel --prod
```

### الخطوة 4: الوصول للموقع
- Production URL سيظهر بعد النشر
- مثال: `https://alloul.vercel.app`
- أو domain مخصص: `https://app.alloul.one`

### الخطوة 5: التحقق
```bash
# التحقق من البناء:
curl https://your-domain.com

# التحقق من البيانات الثابتة:
curl https://your-domain.com/_next/static/

# عرض السجلات:
vercel logs --prod
```

---

## المرحلة 3️⃣: Backend Deployment

### الخيار 1: Vercel Functions
```bash
cd backend

# تثبيت Vercel CLI
npm install -g vercel

# نشر Functions
vercel --prod
```

### الخيار 2: Traditional Server (Heroku, Railway, Render)

#### على Railway:
```bash
# تسجيل الدخول
railway login

# ربط المشروع
railway init

# نشر
railway up
```

#### على Render:
1. ادخل إلى render.com
2. انشئ Web Service جديد
3. ربط مع GitHub
4. اختر الفرع الصحيح
5. ضع الأوامر:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port 8000`

#### على AWS:
```bash
# استخدم ECS + ECR
# أو Elastic Beanstalk

docker build -t alloul-backend .
docker tag alloul-backend:latest *****.dkr.ecr.us-east-1.amazonaws.com/alloul-backend:latest
docker push *****.dkr.ecr.us-east-1.amazonaws.com/alloul-backend:latest
```

---

## ✅ قائمة التحقق قبل النشر

### iOS
- [ ] تم تحديث Build Number في app.json
- [ ] تم التحقق من Capabilities (Sign in with Apple, Push Notifications)
- [ ] تم اختبار التطبيق على الجهاز
- [ ] تم مراجعة App Privacy Policy
- [ ] تم إضافة صور الـ Screenshots
- [ ] تم اختبار جميع الأوامر الرئيسية

### Web
- [ ] npm run build ينجح بدون أخطاء
- [ ] npm run test ينجح (إن وجد)
- [ ] Environment variables صحيحة
- [ ] API endpoints قابلة للوصول
- [ ] Design responsive على جميع الأحجام
- [ ] أداء مقبول (Lighthouse score > 80)

### Backend
- [ ] جميع المكتبات مثبتة
- [ ] قاعدة البيانات مهاجرة بالكامل
- [ ] Environment variables صحيحة
- [ ] RLS Policies مفعلة
- [ ] API endpoints مختبرة
- [ ] Logs مفعلة

---

## 📊 معلومات البناء

### iOS Build Info
```
Bundle Identifier: com.alloul.one
Version: 1.0.0
Build #: 29
Team: XHN32R5SDV (Mohamed Almenhali)
Certificate: Valid until 2027-03-22
Provisioning Profile: VV264J5Y3V
```

### Web Info
```
Framework: Next.js 14+
Package Manager: npm
Node Version: 18+
Build Command: npm run build
Start Command: npm start
```

### Backend Info
```
Framework: FastAPI
Database: PostgreSQL
Python Version: 3.10+
Database Migrations: Alembic
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Setup
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      # iOS
      - name: Build iOS
        run: eas build --platform ios --auto-submit
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      
      # Web
      - name: Deploy Web
        run: ./deploy-web.sh
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      
      # Backend
      - name: Deploy Backend
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 🆘 استكشاف الأخطاء

### خطأ: Provisioning Profile doesn't support capability
**الحل:**
```bash
# أعد إنشاء Provisioning Profile مع الـ capabilities المطلوبة
eas credentials

# أو أضف capability يدويًا في Apple Developer Portal
```

### خطأ: Build Failed
**التحقق:**
```bash
# عرض السجلات الكاملة
eas build:list
eas build:view <build-id>

# تحقق من:
# - Node dependencies
# - Xcode version
# - iOS SDK version
```

### خطأ: Web Build Failed
**الحل:**
```bash
cd web
npm ci  # clean install
npm run build

# تحقق من:
npm list  # للمكتبات الزائدة
npm audit  # للمشاكل الأمنية
```

---

## 📈 بعد النشر

### 1. الاختبار
- اختبر التطبيق على iOS عبر TestFlight
- اختبر الويب على جميع المتصفحات
- اختبر Backend APIs

### 2. المراقبة
- راقب Errors في Sentry أو Rollbar
- راقب Performance في Datadog أو New Relic
- راقب Uptime في UptimeRobot

### 3. البيانات
- تحقق من Logs في كل Platform
- راقب استخدام Database
- راقب استخدام Storage و Bandwidth

### 4. الأمان
- فعّل WAF على Cloudflare
- راقب Security Headers
- فعّل 2FA على جميع الحسابات

---

## 📞 الدعم

للمساعدة:
- Expo Docs: https://docs.expo.dev
- Vercel Docs: https://vercel.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com
- EAS Submit: https://docs.expo.dev/eas/submit

---

**آخر تحديث:** 2026-04-15
**الحالة:** جاهز للنشر 🚀
