# ربط تطبيق الموبايل بالباكند (تسجيل دخول + تسجيل)

## هل الباكند موجود؟
نعم — مجلد **`backend/`** فيه FastAPI كامل، منها على الأقل:
- `POST /auth/register` — إنشاء حساب (username, email, password)
- `POST /auth/login` — دخول
- `GET /auth/me` — المستخدم الحالي (بعد JWT)
- `GET /health` — فحص أن السيرفر شغال
- `GET /` — معلومة سريعة + رابط `/docs`

قاعدة البيانات الافتراضية: **SQLite** (`app.db` داخل مجلد `backend` عند التشغيل المحلي).

---

## 1) تشغيل الباكند على جهازك

```bash
cd backend
cp .env.example .env
# عدّل .env: ضع SECRET_KEY قوية (أي نص عشوائي طويل)
python3 -m venv .venv
source .venv/bin/activate   # ويندوز: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- جرّب من المتصفح: `http://localhost:8000/docs`  
- جرّب: `http://localhost:8000/health` → يجب `{"status":"ok"}`

### أو Docker (من جذر المشروع)

```bash
cp backend/.env.example backend/.env
# عدّل backend/.env (SECRET_KEY على الأقل)
docker compose up --build
```

الـ API على: `http://localhost:8000`

---

## 2) لماذا TestFlight لا يتصل بـ localhost؟
تطبيق الآيفون **لا يستطيع** فتح `http://192.168.x.x:8000` أو `localhost` إلا في حالات خاصة، وApple تفضّل **HTTPS** للإنتاج.

**الحل العملي لمرحلة الاختبار:**
- ارفع الباكند على سيرفر عام (VPS, Railway, Render, Fly.io, …) مع **HTTPS**، أو
- استخدم نفقًا مثل **Cloudflare Tunnel** أو **ngrok** يعطيك رابط `https://....` يشير لجهازك أو للسيرفر.

ثم في **Expo → Environment variables** (للبناء):
```
EXPO_PUBLIC_API_URL=https://your-real-url.com
```
**بدون** `/` في النهاية.

بعدها **لازم** `eas build` جديد للـ iOS لأن الرابط يُخبَّ داخل التطبيق وقت البناء.

---

## 3) Google / Firebase
الباكند يدعم `POST /auth/firebase` **إذا** ضبطت على السيرفر:
- `GOOGLE_APPLICATION_CREDENTIALS` = مسار ملف خدمة Firebase (JSON)

والتطبيق يحتاج في **بناء EAS** مفاتيح `EXPO_PUBLIC_FIREBASE_*` و `EXPO_PUBLIC_GOOGLE_*`.  
بدون ذلك، **سجّل بالبريد وكلمة المرور** — هذا يكفي للدخول.

---

## 4) CORS
تطبيقات **iOS/Android الأصلية** لا تعتمد على CORS (هذا للمتصفح فقط).  
إذا جرّبت من **Expo Web**، أضف أصل المتصفح في `CORS_ORIGINS` في `backend/.env` أو استخدم `CORS_ORIGINS=*` للتطوير فقط.

---

## 5) تحقق سريع من التطبيق
في شاشة الدخول يظهر **رابط الـ API** + زر **اختبار الخادم**.  
إذا فشل الاختبار، المشكلة قبل تسجيل الدخول (رابط، HTTPS، سيرفر متوقف).

---

## ملخص «اربط كل شي»
1. شغّل الباكند وتأكد `/health` يعمل.  
2. اجعل الـ API على **HTTPS عام**.  
3. ضع `EXPO_PUBLIC_API_URL` في EAS = هذا الرابط.  
4. `eas build` + `eas submit` لنسخة جديدة.  
5. سجّل مستخدمًا جديدًا من التطبيق (أو من `/docs` → `POST /auth/register`).
