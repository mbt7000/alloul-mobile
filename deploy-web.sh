#!/bin/bash

echo "🌐 بدء نشر الويب على Vercel..."
echo "=================================="

# Check web directory
if [ ! -d "web" ]; then
    echo "❌ مجلد web غير موجود"
    exit 1
fi

cd web

# Install dependencies
echo "📦 تثبيت المكتبات..."
npm install

# Build
echo "🔨 جاري البناء..."
npm run build

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo "❌ فشل بناء الويب"
    exit 1
fi

echo "✅ اكتمل بناء الويب"

# Deploy to Vercel
echo ""
echo "🚀 جاري النشر على Vercel..."
echo "المتطلب: يجب أن تكون مسجل دخول في Vercel"
echo "إذا لم تكن مسجل دخول، ستظهر نافذة تسجيل دخول"
echo ""

vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ تم النشر بنجاح!"
    echo "🌐 موقع الويب الآن متاح على Vercel"
else
    echo "⚠️  فشل النشر - تحقق من الأخطاء أعلاه"
fi
