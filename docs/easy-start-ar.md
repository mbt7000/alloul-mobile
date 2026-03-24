# تشغيل سهل (محلي)

## أنا ما أقدر أسوي عنك

- **Firebase / Google / Microsoft / Stripe**: تحتاج تسجيل دخولك أنت في المواقع الرسمية ونسخ المفاتيح. ما في أحد يقدر يعمل هذا بدالك (أمان وحسابات).

## اللي نسويه تلقائياً في المشروع

سكربت **`scripts/bootstrap_local.py`** (يستدعيه **`./easy-start.sh`**):

1. ينشئ **`backend/.env`** من المثال إذا مو موجود.
2. يولّد **`SECRET_KEY`** قوي إذا كان ضعيفاً أو افتراضياً.
3. ينشئ أو يحدّث **`.env` في جذر المشروع** بسطر **`EXPO_PUBLIC_API_URL=http://عنوان-الماك:8000`** (للوصول من التلفون على نفس الواي فاي).

## خطوة واحدة للباكند

من مجلد المشروع الرئيسي:

```bash
chmod +x easy-start.sh
./easy-start.sh
```

أو يدوياً:

```bash
python3 scripts/bootstrap_local.py
cd backend && ./run_local.sh
```

ثم افتح: `http://localhost:8000/docs`

## التطبيق (Expo)

بعد ما يشتغل الباكند:

```bash
npx expo start
```

إذا غيّرت `.env` في الجذر، أعد تشغيل Expo.

## إذا بغيت Google أو Microsoft

راجع `docs/connect-backend-mobile-ar.md` أو الجداول في المحادثة — المفاتيح من حسابك فقط.
